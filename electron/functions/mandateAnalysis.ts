import { IpcMainInvokeEvent } from "electron";
import { Language } from "../../shared/profile.interface";
import { AIAnalysisStatus } from "../../shared/AIAnalysisStatus";
import { FRENCH_PROMPTS } from "../prompts/fr";
import { ENGLISH_PROMPTS } from "../prompts/en";
import { aiService, vectorService } from "../ipcHandlers";
import { LocalkeywordsExtractor } from "../services/KeywordsExtractor/localKeywordsExtract";
import { KeywordsAffinityDatabase } from "../services/KeywordsExtractor/KeywordsAffinityDatabase";

export interface AnalyseMandateProps {
    event: IpcMainInvokeEvent;
    options: {
        rawMandate: string;
        language: Language;
        useAi: boolean;
    }
}

export async function analyzeMandate({ event, options }: AnalyseMandateProps): Promise<{ success?: boolean; error?: string }> {
    const { rawMandate, language, useAi } = options;

    let keywords: string[] = [];
    if (useAi) {
        const isAvailable = aiService.getAvailability();
        if (!isAvailable) {
            return { error: "Not available! Please check your AI configuration." };
        }

    
        try {
            event.sender.send('analysis-status', { status: AIAnalysisStatus.Analyzing, message: 'Analysing the mandate...' });
            const prompt = language === Language.FRENCH ? FRENCH_PROMPTS.ANALYZING(rawMandate) : ENGLISH_PROMPTS.ANALYZING(rawMandate);
            const analysisResult = (await aiService.prompt(prompt, (error) => {
                event.sender.send('error', `AI Service Error: ${error.message}`);
            })) as unknown as { job_title: string; skills: string[]; key_focus: string };
            // update affinity database with new keywords
            const dbAffinity = KeywordsAffinityDatabase.getInstance();
            console.log('Analysis result:', analysisResult);
            const skills = analysisResult.skills.map((skill) => skill.toLowerCase());
            console.log('Incrementing keywords in affinity database:', skills);
            dbAffinity.incrementKeywords(skills);
            keywords = analysisResult.skills;
            dbAffinity.runEvictionPolicy();
            event.sender.send('analysis-status', { status: AIAnalysisStatus.Analyze_Result, data: analysisResult });
            event.sender.send('analysis-status', { status: AIAnalysisStatus.Matching, message: 'Matching experiences and projects...' });
        } catch (error) {
            console.error('Analysis failed:', error);
            event.sender.send('analysis-status', { status: 'error', message: 'Analysis failed' });
            return { error: 'Analysis failed' };
        }
    } else {
        keywords = LocalkeywordsExtractor.extractKeywords(rawMandate, language, );
        const dbAffinity = KeywordsAffinityDatabase.getInstance();
        dbAffinity.incrementKeywords(keywords.map((k) => k.toLowerCase()));
        event.sender.send('analysis-status', { status: AIAnalysisStatus.Local_Analyze_Result, data: { keywords } });
    }

    const matchesExp = await vectorService.rankExperiences(keywords, language);
    event.sender.send('analysis-status', {status: AIAnalysisStatus.MatchesExperiences, data: matchesExp});
    
    const matchesProj = await vectorService.rankProjectsByBullets(keywords, language);
    event.sender.send('analysis-status', {status: AIAnalysisStatus.MatchesProjects, data: matchesProj});
    event.sender.send('analysis-status', { status: AIAnalysisStatus.Success, message: 'Analysis completed' });
    return { success: true };
};