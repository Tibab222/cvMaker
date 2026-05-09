# CV Vector Engine

**A Smart, Dynamic Resume Generator** designed to automate semantic matching between an engineering profile and complex job descriptions. This software utilizes a **Local RAG (Retrieval-Augmented Generation)** approach to ensure data privacy and maximum relevance.

---

## Technical Stack

The project is built on a modern "Local-First" stack:

* **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui.
* **Runtime:** Electron (Secure IPC communication via `contextBridge`).
* **Database:** SQLite (`better-sqlite3`) for persistence and vector storage.
* **AI & NLP:**
    * **LLM:** Mistral (via Ollama) for semantic analysis of mandates.
    * **Embeddings:** `transformers.js` (Model: `Xenova/all-MiniLM-L6-v2`) for local vectorization.
* **Backend Logic:** NestJS-inspired services for database management, vectorization, and AI orchestration.

---

## How the Matching Engine Works

The system goes beyond simple keyword searching by using a 3-step processing pipeline:

### 1. Ingestion & Vectorization (Sync)
The application processes structured JSON data for each experience and project. Every "bullet point" is transformed into a mathematical vector (embedding) representing its semantic meaning and stored in **SQLite**.
> **Performance Note:** The "total reconstruction" sync system is optimized for personal use, providing instantaneous responsiveness for individual profiles.

### 2. Mandate Analysis (Input)
When a job description (JD) is submitted:
1.  **Mistral** analyzes the text to extract a target profile: `{ "job_title", "skills", "key_focus" }`.
2.  The engine generates a global vector for the mandate text.

### 3. Scoring & Assembly (Output)
The software calculates the **Cosine Similarity** between the mandate vector and those in the personal database.
* **Suggest:** The AI automatically selects blocks with the highest relevance scores.
* **Generate:** Export of a custom PDF resume, including a digital signature proving the origin of the generation.

---

## Development Roadmap

### Phase 1: Infrastructure & Communication
* Setup of the Electron Main Process and secure file system management (`userData`).
* API exposure via Preload scripts.

### Phase 2: Profile Management
* Initialization of data schemas (`experiences.json`, `projects.json`, etc.).
* Multi-profile management system.

### Phase 3: Data Editor
* Dynamic forms with sub-block management and tagging systems.

### Phase 4: Intelligence & Vectorization
* Integration of the local embedding engine.
* Development of the `VectorService` for Database/Similarity orchestration.

### Phase 5: CV Builder
* Interactive selection interface with real-time preview.
* Automatic matching based on AI relevance scores.

---

### About the Developer
[cite_start]Developed by **Thibaut Delahaie**, a Computer Engineering student at **Polytechnique Montréal**[cite: 4, 9]. [cite_start]This project demonstrates how personal tools can outperform traditional recruitment methods by leveraging the latest advances in Generative AI and local vector search[cite: 14, 15, 24].

---

### Quick Start
```bash
# Install dependencies
npm install

# Start Ollama (Ensure Mistral is installed: 'ollama run mistral')
ollama serve

# Run the app in development mode
npm run dev
```

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.