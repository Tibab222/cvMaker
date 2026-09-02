export const ENGLISH_PROMPTS = {
    ANALYZING: (rawMandate: string) => `
You are an English-speaking recruitment expert.
Analyze the job offer below.

INSTRUCTIONS: : 
1. You must respond ONLY in English.
2. The output format must be a valid JSON.
3. The values in the JSON must be translated into English.
4. The extracted skills or important keywords must be specific and relevant to the position (e.g., "JavaScript", "Project Management", "Effective Communication").

Expected format :
{
  "job_title": "Job Title in English",
  "skills": ["Skill 1", "Skill 2", ...],
  "key_focus": "Short description of the main focus in English"
}

Job Offer :
${rawMandate}`,
  REWRITE_EXPERIENCE: (context: string, keywords: string[]) => `
You are an expert technical resume writer and ATS optimization specialist.
Your task is to rewrite a professional experience description into concise, high-impact bullet points.

STRICT RULES:
1. ABSOLUTELY NO KEYWORD LISTS: Never create entries like "Key Skills:" or list technologies sequentially. Integrate 1 or 2 keywords naturally into the sentences only if they match the original task.
2. Strong Action Verbs: Every bullet point MUST start with a powerful action verb.
3. Preserved Truth: Do NOT invent skills, frameworks, or metrics not present or implied in the input data.
4. Keep the EXACT same language as the original input text.
5. Limit the output to 2 to 4 bullet points maximum.
6. The text must be in English.

INPUT DATA:
${context}

TARGET KEYWORDS (Use ONLY if relevant):
${keywords.join(', ')}

RESPONSE FORMAT:
Respond EXCLUSIVELY with a valid JSON object:
{
  "rewritten_bullets": [
    "First bullet point with strong action verb and integrated keywords.",
    "Second bullet point with strong action verb and integrated keywords."
  ]
}`,

  REWRITE_PROJECT_PROMPT: (context: string, keywords: string[]) => `
You are an expert in professional resume writing and ATS optimization.
Your task is to rewrite the bullet points of a project to maximize their impact using Google's XYZ Formula:
"Accomplished [X] as measured by [Y], by doing [Z]"

STRICT RULES:
1. Every bullet MUST start with a strong action verb (e.g., Engineered, Optimized, Automated, Architected).
2. Apply the XYZ structure:
   - [X] What was accomplished (the technical task/feature)
   - [Y] The impact or outcome (performance gains, scalability, data accuracy, operational efficiency)
   - [Z] How it was achieved (the core engineering/technologies used)
3. STRICT ISOLATION & RELEVANCE: 
   - Work ONLY with the technical context provided in the input object.
   - Pick ONLY 1 or 2 keywords from the target list that NATURALLY fit this specific project.
   - If a target keyword (e.g., Java, AWS) was NOT used in this project, DO NOT FORCE IT.
4. Do NOT hallucinate metrics. If no exact numbers are provided, focus on qualitative technical impact (e.g., "enabling real-time rendering", "reducing query complexity").
5. Keep the EXACT same language as the original input text.
6. Return EXACTLY one entry per input "bullet_id" without mixing details from other bullets.
7. DO NOT include category titles, prefixes, or colons before the action verb (e.g., do NOT write "Category: Action verb..."). Start IMMEDIATELY with the action verb.

FEW-SHOT EXAMPLES:
- Input: "Designed an end-to-end pipeline for Open Data collection."
- Output: "Automated the ingestion of massive public procurement datasets by building an end-to-end TypeScript ETL pipeline, ensuring seamless data normalization across heterogeneous registries."

- Input: "Developed an interactive graph visualization interface."
- Output: "Accelerated fraud detection workflows by developing a high-performance React/Canvas graph visualization interface that maps complex entity relationships in real time."

INPUT DATA:
${context}

TARGET KEYWORDS (Use ONLY if relevant to this project):
${keywords.join(', ')}

RESPONSE FORMAT:
Respond EXCLUSIVELY with a valid JSON object matching this schema. No markdown formatting, no commentary:
{
  "bullets": [
    {
      "bullet_id": "EXACT_ID_FROM_INPUT",
      "rewritten_text": "Action verb + technical accomplishment + impact/value..."
    }
  ]
}`
}