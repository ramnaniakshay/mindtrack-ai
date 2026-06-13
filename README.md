# FocusNest - Student Mental Wellness & Exam Stress Tracker

**FocusNest** is a comprehensive, full-stack, Generative AI-powered mental wellness companion designed for students preparing for high-stakes competitive exams (including JEE, NEET, UPSC, CAT, GATE, and Board Exams). 

The app features dynamic countdowns, visual HSL SVG analytics, journal cognitive analysis, an empathetic chatbot, client-side synthesized soundscapes, and mindfulness tools to break panic spirals.

---

## 🚀 Key Features

1. **Dashboard & Exam Countdown**
   * Configurable exam goals (JEE, NEET, UPSC, CAT, GATE, Boards) with live countdowns.
   * Mood history visualization using custom HSL-tailored SVG charting to track energy and stress trends.

2. **Smart Journaling & Cognitive Distortion Classifier**
   * Classifies journal entry sentiment and computes a numeric stress index.
   * Screens text for cognitive distortions (such as *Catastrophizing*, *Black-and-White thinking*, or *Should statements*).
   * Identifies academic stress triggers (e.g., Mock Tests, Backlog anxiety, Peer pressure).

3. **Aura - The AI Wellness Companion**
   * Interactive chat companion built on Vertex AI / Gemini 1.5 Flash.
   * Automatically adapts its tone, empathy, and study advice to the target exam selected by the student.
   * Safe-by-design: Intercepts crisis keywords to instantly serve local support and helpline cards.
   * Local heuristic fallback engine enables companion chat functionality even without an active Gemini API key.

4. **Stress Buster Suite**
   * **4-7-8 Breathing Circle**: Animated breathing exercise guide.
   * **5-4-3-2-1 Grounding Game**: Sensory grounding walkthrough to interrupt panic spirals.
   * **Zen Sound Mixer**: Client-side Web Audio API audio mixer synthesizing white noise, brown noise, ocean waves, and binaural beats.

5. **Aesthetics & Accessibility**
   * Complete support for Light & Dark modes.
   * ARIA-compliant semantics, keyboard navigation support, and fully responsive CSS grid layout.

6. **Enterprise-Grade Security**
   * **Frictionless Authorization**: Uses Anonymous UUID Device Sessions to safely segment journal and chat data without forced logins.
   * **Prompt Hardening & Escaping**: Defensively sanitizes JSON AI outputs and patches stored XSS with client-side HTML escaping.
   * **Rate Limiting**: Protects Gemini AI endpoints from cost-amplification via IP throttling.
   * **Encrypted Secrets**: Dynamically fetches DB credentials and API keys via Google Cloud Secret Manager (non-blocking).

---

## 🛠️ Technology Stack

* **Frontend**: HTML5, Vanilla Javascript (ESM), and Custom CSS.
* **Backend**: Node.js, Express.js.
* **Database**: PostgreSQL (Cloud SQL).
* **AI Engine**: Gemini 1.5 Flash API (with localized fallback).
* **Containerization**: Docker (Multi-stage build).
* **Hosting**: GCP Cloud Run.

---

## 📦 Project Structure

```
/home/cygnet/main-challange/new/
├── package.json               # Full-stack dependencies and scripts
├── vite.config.js             # Vite development proxy routing
├── Dockerfile                 # Production container compilation
├── build.sh                   # Artifact Registry build and push automation
├── index.html                 # Accessible SPA container layout
├── style.css                  # Calming theme variables and core design system
├── main.js                    # SPA coordinator, charts, and network requests
├── server.js                  # Express API server & static asset serving
├── db.js                      # DB pool, auto-migrations, and socket fallback routing
├── gemini.js                  # Gemini API connection and simulation fallback logic
├── safety.js                  # Crisis keyword interceptor rules
├── src/                       # Frontend application modules
│   ├── audio.js               # Web Audio API sound synthesizers
│   ├── breathing.js           # 4-7-8 timer pacing loop
│   └── grounding.js           # Grounding exercise setup
└── test/                      # Jest unit test suite
```

---

## ⚙️ Setup & Local Development

### 1. Prerequisites
* **Node.js**: v18+ (tested on Node v24)
* **PostgreSQL**: Local database or accessible GCP Cloud SQL instance.
* **Google Cloud SDK** (if deploying or reading secrets).

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a local `.env` or set the environment variables in your terminal:
```env
PORT=3000
DB_PASSWORD=your_database_password
GEMINI_API_KEY=your_gemini_api_key  # Optional: Falls back to localized simulation if missing
```

### 4. Run Development Server
Boot backend server and Vite frontend compiler concurrently:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Running Tests
Run Jest tests:
```bash
npm test
```

---

## 🚢 Production & GCP Deployment

### Docker Build
Compile the production-ready multi-stage image:
```bash
./build.sh
```

### Cloud Run Deployment
Deploy the container to Cloud Run, mounting your database over the Cloud SQL Unix socket sidecar and binding GCP Secret Manager passwords:
```bash
gcloud run deploy mental-wellness-tracker \
  --image=asia-south1-docker.pkg.dev/[PROJECT_ID]/[AR_REPO]/mental-wellness-tracker:latest \
  --region=asia-south1 \
  --project=[PROJECT_ID] \
  --add-cloudsql-instances=[PROJECT_ID]:asia-south1:my-pg-db \
  --set-secrets=DB_PASSWORD=DB_PASSWORD:latest \
  --allow-unauthenticated
```
