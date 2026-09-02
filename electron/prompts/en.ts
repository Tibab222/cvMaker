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
${rawMandate}`,
  REWRITE_EXPERIENCE: (context: string, keywords: string[]) => `
You are an expert in professional resume writing and ATS optimization.
Your task is to rewrite the experience descriptions to align with the job offer.

STRICT RULES :
1. Conserve the historical truth of the facts (do not make absurd inventions).
2. Make the text impactful, professional, and results-oriented.
3. Integrate naturally the target keywords provided if possible.
4. RRespond EXCLUSIVELY in the form of a valid JSON object in the exact format below. No text before or after.
5. Conserve the same language as the original text.

Data to be rewritten:
${context}

Target Keywords:
${keywords.join(', ')}

JSON format expected:
{
  "rewritten_description": "string"
}`,

  REWRITE_PROJECT_PROMPT: (context: string, keywords: string[]) => `
You are an expert in professional resume writing and ATS optimization.
Your task is to rewrite the bullet points of a project to maximize their impact.

STRICT RULES :
1. Each rewritten bullet MUST start with a **strong action verb** (e.g., *Developed*, *Designed*, *Optimized*, *Architected*).
2. Highlight the technical impact, the technologies used, and the goal of the project.
3. Integrate the target keywords smoothly.
4. Do not reinvent the project: keep the real facts provided.
5. Keep the same language as the original text.
6. Rigorously preserve each "bullet_id" provided in the input.

INPUT DATA:
${context}

TARGET KEYWORDS:
${keywords.join(', ')}

RESPONSE FORMAT:
You must respond EXCLUSIVELY in the form of a valid JSON object. No explanatory text, no Markdown introduction tags.

Example of expected structure :
{
  "bullets": [
    {
      "bullet_id": "ID_BULLET_RECU",
      "rewritten_text": "Verbe d'action + réalisation technique intégrant les mots-clés..."
    }
  ]
}`
}