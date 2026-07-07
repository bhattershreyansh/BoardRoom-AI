# BoardRoom AI — Executive Interview Engine

Welcome to the **BoardRoom AI Executive Interview Engine**. This application conducts fully autonomous, voice-based AI interviews for C-suite and senior executive candidates. It leverages **LiveKit** for ultra-low latency WebRTC voice transport, **FastAPI** for robust backend session management, and **Claude 3.5 Sonnet** as the underlying "Interview Brain."

This README serves as your guide to understanding how the application works, its architecture, and how to use it during a demonstration.

---

## 🎯 High-Level Overview

The system is broken down into three distinct phases:

1. **Phase 1: Ingestion Pipeline (Admin & HR)**
   HR uploads a candidate's Resume and Job Description (JD) via the Admin Dashboard. The system asynchronously parses and evaluates the documents using LLMs to dynamically generate a tailored **Candidate Profile** and **Interview Plan**.
2. **Phase 2: The Interview Conductor (Live Voice Session)**
   The candidate joins a sleek, web-based React frontend. An autonomous AI voice agent connects via LiveKit WebRTC. The agent dynamically shifts through interview phases (Opening, Probing, Closing) based on the candidate's responses and the required competencies.
3. **Phase 3: Post-Interview Evaluation**
   As soon as the call ends, the system aggregates the full transcript and generates a detailed Markdown & JSON evaluation report, saving it back to the PostgreSQL database for HR review.

---

## 🏗 Architecture & Tech Stack

- **Frontend**: React, Vite, TailwindCSS, Framer Motion, and LiveKit React Components (`lovable-project`).
- **Backend API**: Python FastAPI, SQLAlchemy, PostgreSQL (Neon Serverless).
- **Voice Agent Worker**: Python `livekit-agents` library, running a persistent worker process.
- **AI / LLM**: Anthropic Claude (Interview Brain & Document Ingestion).
- **Voice Engine**: LiveKit Cloud (handles WebRTC, VAD, STT via Deepgram, and TTS).

---

## 🚀 Step-by-Step Demo Guide

Here is exactly how to run through a demo of the application:

### Step 1: The HR Admin Dashboard
1. **Navigate to the `/admin` page** on the frontend.
2. **Upload Candidate Data**: Fill in the candidate's name, email, and upload a sample PDF Resume and Job Description (JD).
3. **What happens behind the scenes?**
   - The FastAPI backend (`api/routes/sessions.py`) receives the multipart form data.
   - It runs an asynchronous ingestion task using Claude to extract structured data into a `CandidateProfile` (Career arc, gaps, domains).
   - It stores the newly generated session in the PostgreSQL database with the status set to `scheduled`.

### Step 2: Candidate Onboarding
1. Once scheduled, the Admin Dashboard generates a unique interview link (`/interview/<session_id>`). 
2. Open this link in a new tab (or incognito window) to simulate the candidate's experience.
3. The candidate lands on a "Waiting Room" screen with instructions to ensure their microphone is working.

### Step 3: The Live AI Interview
1. **Click "Start Interview"**.
2. **What happens behind the scenes?**
   - The React frontend requests a secure token from the FastAPI backend.
   - The backend changes the DB status from `scheduled` to `active` (In progress).
   - The frontend establishes a WebRTC connection to LiveKit Cloud.
   - The Python LiveKit worker (`conductor/agent.py`) is instantly notified by LiveKit Cloud. It joins the room, fetches the `CandidateProfile` from the DB, and says "Hello."
3. **Demo Interaction**: Talk naturally with the AI. You can interrupt the AI (handled seamlessly by LiveKit's Voice Activity Detection and turn detectors). Notice the UI waveform animating beautifully in sync with the active speaker.

### Step 4: Graceful Disconnect & Edge-Case Safeguards
1. **Click "End Call"** on the frontend.
2. The UI instantly updates to an "Interview Ended" screen and instructs the candidate to close the tab.
3. **What happens behind the scenes?**
   - The Python worker detects `participant_disconnected`.
   - It triggers the `run_post_interview_evaluation()` async task.
   - It uses the complete transcript to grade the candidate against the core competencies and saves a final Evaluation Report to the Postgres database.
   - The session status is locked to `completed`.
4. **Safeguard Demo**: If you try to refresh the candidate's browser page or re-use the interview link, the frontend and backend will both immediately block access and say "This interview has already been completed," preventing abuse.

### Step 5: Reviewing the Results
1. Navigate back to the `/admin` dashboard.
2. The sessions table will now reflect the status as **Completed**.
3. *[Future feature/Optional]*: HR can click on the completed session to view the final generated Markdown report, transcript, and AI-driven competency scores.

---

## 🛠 Local Development Cheat Sheet

If you are running the project locally for the demo, ensure the following three processes are running simultaneously:

1. **Frontend (React/Vite)**
   ```bash
   cd lovable-project-...
   npm run dev
   ```
2. **Backend API (FastAPI)**
   ```bash
   cd Interview-Agent
   source .venv/bin/activate
   uvicorn api.main:app --reload
   ```
3. **LiveKit Voice Agent Worker**
   ```bash
   cd Interview-Agent
   source .venv/bin/activate
   python conductor/agent.py dev
   ```

*Tip: Make sure your `.env` file is fully populated with `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `NEON_DB_URL`, and `ANTHROPIC_API_KEY` before starting.*
