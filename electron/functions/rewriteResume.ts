import { IpcMainInvokeEvent } from "electron";
import { RewriteResumeOptions } from "../../shared/RewriteResume.type";
import { aiService } from "../ipcHandlers";
import { Language } from "../../shared/profile.interface";
import { FRENCH_PROMPTS } from "../prompts/fr";
import { ENGLISH_PROMPTS } from "../prompts/en";
import { AIAnalysisStatus } from "../../shared/AIAnalysisStatus";

export interface RewriteResumeProps {
  event: IpcMainInvokeEvent;
  options: RewriteResumeOptions;
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

export async function rewriteResume({ event, options }: RewriteResumeProps): Promise<{ success?: boolean; error?: string }> {
  const { experiences, projects, language } = options;

  if (!aiService.getAvailability()) {
    return { error: "AI Service is not available. Check your configuration." };
  }

  const prompts = language === Language.FRENCH ? FRENCH_PROMPTS : ENGLISH_PROMPTS;
  const totalItems = experiences.length + projects.length;
  let completedItems = 0;

  try {
    event.sender.send('analysis-status', { 
      status: AIAnalysisStatus.Analyzing, 
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

      const parsed = parseAIJsonResponse<{ rewritten_description: string }>(rawResponse);

      completedItems++;

      event.sender.send('analysis-status', {
        status: AIAnalysisStatus.Rewrite_Experience_Item,
        progress: { completed: completedItems, total: totalItems },
        data: {
          experience_id: exp.experience_id,
          rewritten_description: parsed.rewritten_description
        }
      });
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
    }

    event.sender.send('analysis-status', { 
      status: AIAnalysisStatus.Success, 
      message: 'All items successfully rewritten!' 
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