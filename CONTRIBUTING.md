# Contributing to CV Maker Engine

First off, thank you for considering contributing to CV Maker Engine! This is an open-source, community-driven project built to help students and job seekers automate resume matching for free.

Whether you want to optimize our local NLP logic, fix a bug, or completely redesign a React component, your help is welcome!

## Architecture & Design Suggestions (Seniors Welcome!)
As a computer engineering student, I built the core skeleton of this resume builder system, but I am fully aware that it is far from perfect! 

If you are a senior developer or have any suggestion to improve the system, **I am deeply open to your feedback, structural criticism, and suggestions.** If you see a fundamental flaw or an optimization opportunity (especially in the vectorization or scoring logic), please open an Issue to discuss it or start a discussion. I’m here to learn!

## How Can I Contribute?

### 1. Find an Issue
Look at the [Issues](https://github.com/Tibab222/cvMaker/issues) tab. We use specific labels to help you find your way:
* `good first issue`: Perfect for getting started or for quick UI/UX improvements.
* `help wanted`: Core features, algorithms, or refactoring needs.

Before starting to code, please **leave a comment on the issue** so we can assign it to you and avoid duplicate work!

### 2. Project Layout Reminders
To keep the codebase clean, please respect our boundaries:
* 🖥️ **Electron / Backend:** `electron/services/` (Vector DB, local extraction logic).
* ⚛️ **Frontend UI:** `src/components/` (React components, layouts, Tailwind styles). Note: `src/` is the source for everything related to frontend.
* 🔄 **Shared Types:** `shared/` (Interfaces used by both IPC sides).

## Workflow

1. **Fork** the repository.
2. Create a new branch for your feature (`git checkout -b feature/amazing-ui`).
3. Code your changes (ensure your dev environment runs smoothly with `npm run dev`).
4. **Document your work:** If your feature adds new services or modifies existing IPC endpoints, please add clear code comments or update the README.md.
5. Commit your changes cleanly.
6. Push to your branch and open a **Pull Request (PR)** against the `main` branch.

## Code of Conduct & Communication
This project is maintained with a mindset of mentorship and learning. Be kind, helpful, and open to feedback. There is no such thing as a perfect codebase, we are all here to learn and build a cool product together!

**Need to chat?** If you have questions about the architecture, want to bounce an idea before coding, or just want to sync up, feel free to open a GitHub Discussion or reach out directly on Discord: `tibabb`