import type { CoverLetterBlock, GenerateCoverLetterDTO } from "../../shared/CoverLetter.types";
import { Language } from "../../shared/profile.interface";
import { aiService } from "../ipcHandlers";
import { ENGLISH_PROMPTS } from "../prompts/en";
import { FRENCH_PROMPTS } from "../prompts/fr";

const firstParagraph = (companyName: string, roleName: string) => 
    `Dear Hiring Team at ${companyName}, 
    I am writing to express my strong interest in ${roleName} position at ${companyName}.`;

const closing = (companyName: string) => 
    `Thank you for your time and consideration. 
    I would welcome the opportunity to discuss how my technical background and project experience align with the goals of ${companyName}.`;

function buildBlockParagraph(content: string, position: number): CoverLetterBlock {
    return {
        id: crypto.randomUUID(),
        position: position,
        content: content,
        isEditable: true
    }
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

export async function generateCoverLetter(options: GenerateCoverLetterDTO) {
    const { coverLetterData, experiences, projects, education, targetKeywords, language } = options;
    const educationSummary = education.map(edu => `${edu.degree} from ${edu.institution}: ${edu.description}`).join(", ");
    const experienceSummary = experiences.map(exp => `${exp.jobTitle} at ${exp.company}`).join(", ");
    const projectSummary = projects.map(proj => `${proj.title}: ${proj.bullets.join(", ")}`).join(", ");

    if (!aiService.getAvailability()) {
        return { error: "AI Service is not available. Check your configuration." };
    }

    const prompts = language === Language.FRENCH ? FRENCH_PROMPTS : ENGLISH_PROMPTS;

    try {
        const firstParaContent = firstParagraph(coverLetterData.companyName, coverLetterData.roleName);
        const firstBlock = buildBlockParagraph(firstParaContent, 0);
        // send an event to the renderer process with the first block
        console.log("First paragraph block generated:", firstBlock);

        const expPrompt = prompts.EXPERIENCE_PARAGRAPH(experienceSummary, educationSummary, coverLetterData.roleName, coverLetterData.companyName, targetKeywords.join(', '));

        const rawResponse = await aiService.prompt(expPrompt, (err) => {
            console.error("[CoverLetter] Error on EXPERIENCE_PARAGRAPH:", err);
        });
        const secondParaContent = parseAIJsonResponse<{ paragraph: string }>(rawResponse).paragraph;
        const secondBlock = buildBlockParagraph(secondParaContent, 1);
        // send an event to the renderer process with the second block
        console.log("Second paragraph block generated:", secondBlock);

        const skillPrompt = prompts.PROJECT_FITTING_PARAGRAPH(projectSummary, coverLetterData.roleName, coverLetterData.companyName, targetKeywords.join(', '));
        const rawSkillResponse = await aiService.prompt(skillPrompt, (err) => {
            console.error("[CoverLetter] Error on PROJECT_FITTING_PARAGRAPH:", err);
        });
        const thirdParaContent = parseAIJsonResponse<{ paragraph: string }>(rawSkillResponse).paragraph;
        const thirdBlock = buildBlockParagraph(thirdParaContent, 2);
        // send an event to the renderer process with the third block
        console.log("Third paragraph block generated:", thirdBlock);

        const closingParaContent = closing(coverLetterData.companyName);
        const closingBlock = buildBlockParagraph(closingParaContent, 3);
        // send an event to the renderer process with the closing block
        console.log("Closing paragraph block generated:", closingBlock);

    } catch (error) {
        console.error('[CoverLetter] Process failed:', error);
        // send an event with error
        return { error: error instanceof Error ? error.message : 'Unknown error' };
      }
}