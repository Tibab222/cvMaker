import { IpcMainInvokeEvent } from "electron";
import { MistralService } from "../services/MistralService";
import { Language } from "../../shared/profile.interface";
import { AIAnalysisStatus } from "../../shared/AIAnalysisStatus";
import { FRENCH_PROMPTS } from "../prompts/fr";
import { ENGLISH_PROMPTS } from "../prompts/en";
import { vectorService } from "../ipcHandlers";
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

    if (useAi) {
        const mistral = MistralService.getInstance();
        const isAvailable = await mistral.checkAvailability();
        if (!isAvailable) {
            return { error: "Mistral is not available" };
        }
    
        try {
            event.sender.send('analysis-status', { status: AIAnalysisStatus.Analyzing, message: 'Analysing the mandate...' });
            const prompt = language === Language.FRENCH ? FRENCH_PROMPTS.ANALYZING(rawMandate) : ENGLISH_PROMPTS.ANALYZING(rawMandate);
            const analysisResult = (await mistral.analyze(prompt)) as { job_title: string; skills: string[]; key_focus: string };
            // update affinity database with new keywords
            const dbAffinity = KeywordsAffinityDatabase.getInstance();
            dbAffinity.incrementKeywords(analysisResult.skills.map((skill) => skill.toLowerCase()));
            dbAffinity.runEvictionPolicy();
            event.sender.send('analysis-status', { status: AIAnalysisStatus.Analyze_Result, data: analysisResult });
            event.sender.send('analysis-status', { status: AIAnalysisStatus.Matching, message: 'Matching experiences and projects...' });
            const queryText = `${analysisResult.job_title} ${analysisResult.skills.join(' ')} ${analysisResult.key_focus}`;
            const matchesExp = await vectorService.rankExperiences(queryText);
            event.sender.send('analysis-status', {status: AIAnalysisStatus.MatchesExperiences, data: matchesExp});
            
            const matchesProj = await vectorService.rankProjectsByBullets(queryText);
            event.sender.send('analysis-status', {status: AIAnalysisStatus.MatchesProjects, data: matchesProj});
            event.sender.send('analysis-status', { status: AIAnalysisStatus.Success, message: 'Analysis completed' });
            return { success: true };
        } catch (error) {
            console.error('Analysis failed:', error);
            event.sender.send('analysis-status', { status: 'error', message: 'Analysis failed' });
            return { error: 'Analysis failed' };
        }
    } else {
        const keywords = LocalkeywordsExtractor.extractKeywords(rawMandate, language, );
        event.sender.send('analysis-status', { status: AIAnalysisStatus.Local_Analyze_Result, data: { keywords } });
        return { success: true };
    }
};