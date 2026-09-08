import { IpcMainInvokeEvent } from "electron";
import { RewriteResumeOptions } from "../../shared/RewriteResume.type";
import { aiService } from "../ipcHandlers";
import { Language } from "../../shared/profile.interface";
import { FRENCH_PROMPTS } from "../prompts/fr";
import { ENGLISH_PROMPTS } from "../prompts/en";
import { AIAnalysisStatus } from "../../shared/AIAnalysisStatus";
import { EntityType, buildCustomKey } from "../../shared/utils";
import { JobApplicationManager } from "../services/jobApplications/jobApplicationManager";
import { JobApplicationStatus } from "../../shared/jobApplications.type";

export interface RewriteResumeProps {
  event: IpcMainInvokeEvent;
  options: RewriteResumeOptions;
}

export interface TopResumeResult {
  summary_bullets: string[];
}

export interface GenerateTopResumeOptions {
  profileContext: string;
  targetJob?: string;
  language: Language;
}

function parseAIJsonResponse<T>(rawResponse: string): T {
    if (typeof rawResponse === 'object' && rawResponse !== null) {
        return rawResponse as T;
    }

    if (typeof rawResponse === 'string') {
        const cleanedJson = rawResponse.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleanedJson) as T;
    }

    throw new Error(`Unexpected response type from AI service: ${typeof rawResponse}`);
}

const updateCustomField = (entityType: EntityType, id: string, field: string, value: string, customTexts: Record<string, string>) => {
  const key = buildCustomKey(entityType, id, field);
  customTexts[key] = value;
};

async function generateTopResume(options: GenerateTopResumeOptions) {
  const { profileContext, language } = options;
  const prompts = language === Language.FRENCH ? FRENCH_PROMPTS : ENGLISH_PROMPTS;
  const prompt = prompts.GENERATE_TOP_RESUME(profileContext);

  const rawResponse = await aiService.prompt(prompt, (err) => {
    console.error("[Rewrite] Error on generateTopResume:", err);
  });

  const parsed = parseAIJsonResponse<TopResumeResult>(rawResponse);

  return {
    summary_bullets: parsed.summary_bullets,
  };
}

export async function rewriteResume({ event, options }: RewriteResumeProps): Promise<{ success?: boolean; error?: string; id?: string }> {
  const { experiences, projects, language, resumeData } = options;
  const customTexts = resumeData.customTexts || {};

  if (!aiService.getAvailability()) {
    return { error: "AI Service is not available. Check your configuration." };
  }

  const prompts = language === Language.FRENCH ? FRENCH_PROMPTS : ENGLISH_PROMPTS;
  const totalItems = experiences.length + projects.length;
  let completedItems = 0;

  try {
    event.sender.send('analysis-status', { 
      status: AIAnalysisStatus.Rewriting, 
      message: `Starting rewrite process (0/${totalItems})...` 
    });

    for (const exp of experiences) {
      const context = JSON.stringify({
        role: exp.role,
        company: exp.company,
        current_description: exp.description
      }, null, 2);

      const prompt = prompts.REWRITE_EXPERIENCE(context, exp.keywords);
      
      const rawResponse = await aiService.prompt(prompt, (err) => {
        console.error(`[Rewrite] Error on experience ${exp.experience_id}:`, err);
      });

      const parsed = parseAIJsonResponse<{ rewritten_bullets: string[] }>(rawResponse);

      completedItems++;

      const newDescription = parsed.rewritten_bullets.map(b => `- ${b}`).join('\n');

      event.sender.send('analysis-status', {
        status: AIAnalysisStatus.Rewrite_Experience_Item,
        progress: { completed: completedItems, total: totalItems },
        data: {
          experience_id: exp.experience_id,
          rewritten_description: newDescription,
        }
      });

      updateCustomField('experience', exp.experience_id, 'description', newDescription, customTexts);
    }

    for (const proj of projects) {
      const context = JSON.stringify({
        project_title: proj.title,
        bullets: proj.bullets.map(b => ({
          bullet_id: b.bullet_id,
          text: b.text
        }))
      }, null, 2);

      const prompt = prompts.REWRITE_PROJECT_PROMPT(context, proj.keywords);

      const rawResponse = await aiService.prompt(prompt, (err) => {
        console.error(`[Rewrite] Error on project ${proj.project_id}:`, err);
      });

      const parsed = parseAIJsonResponse<{ bullets: { bullet_id: string; rewritten_text: string }[] }>(rawResponse);

      completedItems++;

      event.sender.send('analysis-status', {
        status: AIAnalysisStatus.Rewrite_Project_Item,
        progress: { completed: completedItems, total: totalItems },
        data: {
          project_id: proj.project_id,
          bullets: parsed.bullets
        }
      });

      for (const bullet of parsed.bullets) {
        updateCustomField('bullet', bullet.bullet_id, 'text', bullet.rewritten_text, customTexts);
      }
    }

    resumeData.customTexts = customTexts;

    // use the resume infos to create a context
    const targetJob = resumeData.jobInfos?.title || '';
    const targetKeywords = resumeData.jobInfos?.keywords || [];
    const experiencesHistory = experiences.map(exp => {
      const bullets = exp.description ? exp.description.split('\n').slice(0, 2).join(' ') : '';
      return `${exp.role} chez ${exp.company}${bullets ? ` (${bullets})` : ''}`;
    }).join('; ');
    const projectsHistory = projects.map(proj => {
      const bullets = proj.bullets.slice(0, 2).map(b => b.text).join(', ');
      return `${proj.title}${bullets ? ` (${bullets})` : ''}`;
    }).join('; ');

    const profileContext = `
      Target Job: ${targetJob}
      Target Keywords: ${targetKeywords.join(', ')}
      Experience History: ${experiencesHistory}
      Project History: ${projectsHistory}
    `.trim();
    const topResume = await generateTopResume({ profileContext, targetJob, language });

    resumeData.topResumeSummary = topResume.summary_bullets;

    event.sender.send('analysis-status', {
      status: AIAnalysisStatus.TOP_RESUME,
      message: 'Top resume summary generated successfully!',
      data: { topResumeSummary: topResume.summary_bullets }
    });

    // Save the updated resume data
    const result = JobApplicationManager.getInstance().saveOrUpdateApplication(resumeData, JobApplicationStatus.REVIEW);

    event.sender.send('analysis-status', { 
      status: AIAnalysisStatus.Success, 
      message: 'All items successfully rewritten!',
      data: { id: result.id }
    });

    return { success: true };

  } catch (error) {
    console.error('[Rewrite] Process failed:', error);
    event.sender.send('analysis-status', { 
      status: AIAnalysisStatus.Error, 
      message: 'Failed to rewrite resume items' 
    });
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}