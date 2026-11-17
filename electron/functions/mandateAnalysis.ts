import { IpcMainInvokeEvent } from "electron";
import { Language } from "../../shared/profile.interface";
import { AIAnalysisStatus } from "../../shared/AIAnalysisStatus";
import { FRENCH_PROMPTS } from "../prompts/fr";
import { ENGLISH_PROMPTS } from "../prompts/en";
import { aiService, vectorService } from "../ipcHandlers";
import { LocalkeywordsExtractor } from "../services/KeywordsExtractor/localKeywordsExtract";
import { KeywordsAffinityDatabase } from "../services/KeywordsExtractor/KeywordsAffinityDatabase";
// import { KeywordSemanticEnhancer } from "../services/KeywordsExtractor/KeywordSemanticEnhancer";

export interface AnalyseMandateProps {
    event: IpcMainInvokeEvent;
    options: {
        rawMandate: string;
        language: Language;
        jobTitle?: string;
        useAi: boolean;
    }
}

export async function analyzeMandate({ event, options }: AnalyseMandateProps): Promise<{ success?: boolean; error?: string }> {
    const { rawMandate, language, useAi, jobTitle } = options;

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
            const skills = analysisResult.skills.map((skill) => skill.toLowerCase());
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
        const candidates = LocalkeywordsExtractor.extractCandidates(rawMandate, language);
        console.log('Local keyword extraction candidates:', candidates.sort((a, b) => b.count - a.count));
        // keywords = await KeywordSemanticEnhancer.cluster(
        //     candidates,
        //     (text) => vectorService.generateEmbedding(text)
        // );
        keywords = candidates.sort((a, b) => b.count - a.count).map((candidate) => candidate.original);
        console.log('Local keyword extraction result:', keywords);
        keywords = await refineKeywordsWithAI(keywords.slice(0, Math.min(30, keywords.length)), language, jobTitle);

        // const dbAffinity = KeywordsAffinityDatabase.getInstance();
        // dbAffinity.incrementKeywords(keywords.map((k) => k.toLowerCase()));
        event.sender.send('analysis-status', { status: AIAnalysisStatus.Local_Analyze_Result, data: { keywords } });
    }

    const matchesExp = await vectorService.rankExperiences(keywords, language);
    event.sender.send('analysis-status', {status: AIAnalysisStatus.MatchesExperiences, data: matchesExp});
    
    const matchesProj = await vectorService.rankProjectsByBullets(keywords, language);
    event.sender.send('analysis-status', {status: AIAnalysisStatus.MatchesProjects, data: matchesProj});
    event.sender.send('analysis-status', { status: AIAnalysisStatus.Success, message: 'Analysis completed' });
    return { success: true };
};

async function refineKeywordsWithAI(candidates: string[], language: Language, jobTitle?: string): Promise<string[]> {
    const isAvailable = aiService.getAvailability();
    if (!isAvailable) return candidates;

    const prompts = language === Language.FRENCH ? FRENCH_PROMPTS : ENGLISH_PROMPTS;
    const prompt = prompts.REFINE_KEYWORDS(candidates, jobTitle);
    const rawResponse = await aiService.prompt(prompt, (error) => {
        console.error('AI Service Error:', error);
    }) as unknown as { keywords: string[] };
    return rawResponse.keywords;
}