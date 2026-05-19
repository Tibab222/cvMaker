# CV Maker Engine

> **"Fight the ATS, empower the job seeker, 100% locally."**

Let's face it: modern recruitment is broken. Companies use **ATS (Applicant Tracking Systems)** to automatically filter out resumes before a human even looks at them. To stand a chance, you now need to create *10 times more resumes*, manually tailoring every single bullet point to match complex job descriptions. 

To make matters worse, online "resume builders" charge monthly subscriptions. **Charging people who don't have a job (and therefore, no money) is fundamentally broken.** **CV Maker Engine** is a geeky, local-first open-source alternative. It's a powerful desktop CV Hub designed to help you organize your experiences and dynamically adapt your resume to any job mandate in seconds—using everything from simple 1-click layout toggles to local semantic AI matching. 

No cloud dependencies, no privacy leaks, zero subscription fees. It's time to build a shield against the corporate bots.

---

## ✨ Key Features

* 🌍 **Multi-language Support:** Ready for global tracking with native French and English resume management.
* 🎛️ **1-Click Modular Interface:** Dynamically show/hide entire sections (experiences, projects, education) or sub-blocks to adapt your resume layout in seconds.
* 🧠 **Hybrid Matching Engine:** * **Lightweight Local NLP:** Instant keyword matching and techno-extraction against local whitelists.
    * **Vector & RAG Search:** Local vectorization (`transformers.js` + SQLite) to calculate semantic similarity scores between your profile and a job mandate.
    * **Optional LLM Power:** Deep mandate analysis using Mistral (via Ollama).
* 📄 **Visual Preview & Export:** Real-time rendering and clean PDF export.
---

## Technical Stack

The project is built on a modern "Local-First" desktop stack:
* Frontend: React, TypeScript, Tailwind CSS, shadcn/ui.
* State Management: Zustand (Global store).
* Runtime: Electron (Secure IPC communication via contextBridge).
* Database: SQLite (better-sqlite3) for metadata persistence and local vector storage.
* AI & NLP:
    - Embeddings: transformers.js (Model: Xenova/all-MiniLM-L6-v2) for local vectorization.
    - LLM (Optional): Mistral (via Ollama) for advanced semantic analysis of job mandates.
    - Fallback: Local NLP extraction rule-set for lightweight, zero-dependency processing.

---

## How the Matching Engine Works

The system goes beyond simple keyword searching by using a 3-step processing pipeline:

### 1. Ingestion & Vectorization (Sync)
The application processes structured JSON data for each experience and project. Every "bullet point" is transformed into a mathematical vector (embedding) representing its semantic meaning and stored in **SQLite**.
> **Performance Note:** The "total reconstruction" sync system is optimized for personal use, providing instantaneous responsiveness for individual profiles.

### 2. Mandate Analysis (Input)
When a job description (JD) is submitted, the engine can analyze it in two ways, depending on the user's choice:
- **Hybrid/Local:** Fast keyword and techno extraction based on local whitelists.
- **AI-Powered:** Mistral analyzes the context to extract a structured target profile: { "job_title", "skills", "key_focus" }.

### 3. Scoring & Assembly (Output)
The software calculates the Cosine Similarity between the target mandate vectors and your personal experience database.
- **Suggest**: The engine automatically flags and selects the text blocks with the highest matching scores.
- **Generate**: Instantly exports a tailored, clean PDF resume.

---

## Architecture
The codebase enforces strict boundaries between the desktop environment and the client interface:

```text
📂 Project architecture
├── 📂 electron/          # Desktop & Backend
│   ├── 📂 services/      # Le cœur du moteur (KeywordsExtractor, Mistral, VectorDB)
│   └── 📂 functions/     # Fonctions appelées par l'interface via IPC
├── 📂 src/               # UI (React + shadcn/ui)
│   ├── 📂 components/    # Graphical components (Éditeur, panneaux, badges)
│   └── 📂 store/         # Global states (Zustand)
└── 📂 shared/            # Shared interfaces between React and Backend (electron)
```

---

## Quick Start
Get your local development environment up and running in less than two minutes:

```bash
# 1. Clone the repository
git clone https://github.com/Tibab222/cvMaker.git
cd cvMaker

# 2. Install dependencies
npm install

# 3. (Optional) Start Ollama if you want to use the Mistral pipeline
# Ensure Mistral is pulled: 'ollama pull mistral'
ollama serve

# 4. Run the app in development mode (Electron + React Hot Reload)
npm run dev
```

### 📝 Note on LLM Configuration (Ollama)
The advanced AI analysis pipeline is optimized for **Mistral 7B (Q4_K_M quantization)**. To ensure optimal parsing and avoid context truncation with long job descriptions, make sure you have it pulled locally:

```bash
ollama pull mistral
```

***Specs tested:***
- Architecture: Llama
- Parameters: 7.2B
- Context Length: 32,768 tokens (Crucial for handling large job descriptions + resume data)
- Quantization: Q4_K_M (Perfect balance between speed and accuracy on local machines)

---

## Future Ideas & Contributions (We are hiring ideas!)

We want this application to become the ultimate power-tool for job seekers. We have a massive backlog of features we want to explore, including:
- Advanced Matching Dashboard: Visual charts showing missing vs. present keywords.
- Multi-LLM Integration: Adding cloud provider API keys (OpenAI, Anthropic) alongside Ollama.
- AI-Powered Block Rewriting: Optional local LLM prompts to refine bullet points for specific roles.
- Custom Template Engine: A system allowing users to import or visually design their own CSS/Tailwind CV templates.

> **Want to build this with us?** We believe open-source can turn this project into something huge. Check out our CONTRIBUTING.md to join the ride, look at the Issues tab to claim a task, or open a new issue to submit your own crazy ideas!

---

### About the Developer
[cite_start]Developed by Thibaut Delahaie, a Computer Engineering student at Polytechnique Montréal. This project was born out of a personal need to bypass inefficient traditional recruitment systems and demonstrate the power of local-first Generative AI applications.

---

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.