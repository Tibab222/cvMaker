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
}`,
  GENERATE_TOP_RESUME: (context: string) => `
You are an expert in ATS optimization.
Your mission is to generate 3 professional summary bullet points for the top of a resume, entirely based on the provided context.

RESUME AND JOB DATA:
${context}

NARRATIVE DIRECTIVES PER BULLET (Write 100% natural and varied sentences):
- Bullet 1 (Positioning & Core Skills): Write a smooth opening sentence that connects the candidate's overall profile to the most relevant key technologies requested by the job offer.
- Bullet 2 (Achievements & Expertise): Write a narrative sentence highlighting a concrete technical achievement or project from the candidate, naturally explaining the solution provided.
- Bullet 3 (Impact & Best Practices): Write a sentence focused on operational added value (automation, reliability, observability, teamwork) and mastered methodologies.

QUALITY AND STYLE REQUIREMENTS:
1. NARRATIVE SYNTAX: Use varied and natural sentence structures with causal relationships (e.g., "...by leveraging...", "...to ensure...", "...enabling...").
2. FLUIDITY: Do NOT create raw lists of keywords. Seamlessly integrate technologies and projects within complete grammatical sentences.
3. NO HEADERS: Never start a bullet point with a keyword followed by a colon (e.g., NO "Projects:", "Lucidflow:", "Impact:"). Write the sentence text directly.
4. FORMAT: Return strictly a valid JSON object with no Markdown tags or comments.
5. NO FABRICATION: Do not invent experiences or skills. Naturally integrate target keywords only if they are relevant to the provided context.

EXPECTED JSON FORMAT:
{
  "summary_bullets": [
    "<written_sentence_1>",
    "<written_sentence_2>",
    "<written_sentence_3>"
  ]
}`,
// COVER LETTER PROMPTS
  EXPERIENCE_PARAGRAPH: (workExperiences: string, education: string, targetRole: string, companyName: string, targetKeywords: string) => `
You are an expert ATS career coach and professional technical writer.
Write a single, cohesive paragraph for a cover letter highlighting the candidate's professional background and core technical skills relevant to the target job.

CANDIDATE WORK EXPERIENCES:
${workExperiences}

CANDIDATE EDUCATION:
${education}

TARGET JOB: ${targetRole}
TARGET COMPANY: ${companyName}
TARGET KEYWORDS: ${targetKeywords}

LANGUAGE: Write the response strictly in english.

INSTRUCTIONS:
1. Focus ON RELEVANT EXPERIENCE:
   - Highlight core technical achievements, software engineering experience, and key skills aligned with the target role.
   - Synthesize experience without list-like repetition; make it flow as a professional narrative.
2. Maintain a confident, professional, and authentic tone.
3. Keep the paragraph concise (3 to 5 well-structured sentences max).
4. Respond STRICTLY in JSON with no markdown formatting or commentary:
{
  "paragraph": "Your generated paragraph text here..."
}
`,
  PROJECT_FITTING_PARAGRAPH: (projects: string, targetRole: string, companyName: string, targetKeywords: string) => `
You are an expert ATS career coach and professional technical writer.
Write a single, cohesive paragraph for a cover letter connecting the candidate's key personal and open-source projects to the target company and role.

CANDIDATE PROJECTS:
${projects}

TARGET JOB: ${targetRole}
TARGET COMPANY: ${companyName}
TARGET KEYWORDS: ${targetKeywords}

LANGUAGE: Write the response strictly in english.

INSTRUCTIONS:
1. FOCUS ON PROJECTS & IMPACT:
   - Select 1 or 2 relevant projects from the candidate's background.
   - Explain how building these projects demonstrates practical problem-solving and technical expertise directly beneficial to ${companyName}.
2. ALIGN WITH TARGET KEYWORDS:
   - Naturally incorporate relevant target keywords where applicable.
3. Keep the paragraph concise (3 to 5 well-structured sentences max).
4. STRICT PERSPECTIVE REQUIREMENT:
  - ALWAYS write in the FIRST PERSON ("I", "my", "me"). 
  - NEVER refer to the applicant as "the candidate", "they", or by name.
5. Respond STRICTLY in JSON with no markdown formatting or commentary:
{
  "paragraph": "Your generated paragraph text here..."
}
`,
  REFINE_KEYWORDS: (candidates: string[], jobTitle?: string) => `
  You are a domain-agnostic ATS keyword normalization engine.
  Your task is to refine a list of candidate keywords extracted from a job posting${jobTitle ? ` for the position of "${jobTitle}"` : ''}.

  FILTERING RULES:
  
1. TARGET SIZE:
  - Extract and return ONLY the TOP 20 to 30 most critical keywords, sort them from most important to least important ${jobTitle ? `for the role of "${jobTitle}"` : ''}.

2. KEEP ONLY (Technical & Industry Terms):
  - Core tools, platforms, technologies, and software
  - Domain concepts & methodologies
  - Essential technical practices
  - Names and abbreviations of programming languages, frameworks, libraries, and tools

3. STRICTLY ELIMINATE (Noise & Legal/HR Text):
  - HR boilerplate, disclaimers, salary info, or privacy notices
  - Education degree requirements or general qualifiers
  - Generic verbs, filler words, and subjective traits
  - Duplicate or overlapping terms
  - remove words standing alone that make no sense in isolation (e.g., "experience", "knowledge", "skills", "ability", "team", "work", "role", "responsibilities", "tasks", "projects", "duties")

4. CONSOLIDATE:
  - Clean up fragmented phrases into standard industry terms

  ${candidates.length > 0 ? `INPUT CANDIDATES: 
    ${candidates.join(', ')}` : 'No input candidates provided.'}

  OUTPUT FORMAT:
  Return STRICTLY a valid JSON object with no Markdown tags, no quotes wrapper, and no introductory or concluding text.

  {
    "keywords": ["Keyword 1", "Keyword 2", ...]
  }
`
}