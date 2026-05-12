export const ENGLISH_PROMPTS = {
    ANALYZING: (rawMandate: string) => `
You are an English-speaking recruitment expert.
Analyze the job offer below.

INSTRUCTIONS: : 
1. You must respond ONLY in French.
2. The output format must be a valid JSON.
3. The values in the JSON must be translated into English.
4. The extracted skills must be specific and relevant to the position (e.g., "JavaScript", "Project Management", "Effective Communication").

Expected format :
{
  "job_title": "Job Title in English",
  "skills": ["Skill 1", "Skill 2", ...],
  "key_focus": "Short description of the main focus in English"
}

Job Offer :
${rawMandate}`
}