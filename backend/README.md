# DevMirror — Backend API

> **A GitHub-Powered Developer Assessment Platform**  
> Built with Node.js 20+, Express, MongoDB / Mongoose, and Free APIs (GitHub REST API + Google Gemini Free API / Deterministic Fallbacks).

---

## 1. Architecture & Design Principles

DevMirror transforms public GitHub repositories into rigorous, interactive technical interviews and personalized learning roadmaps:

1. **Repository Analysis (`/api/repos/analyze`)**:
   - Parses and validates public GitHub URLs (`https://github.com/{owner}/{repo}`).
   - Fetches repository tree, file sizes, and package manifests via GitHub REST API (with free unauthenticated access up to 60 req/hr or free `GITHUB_TOKEN` up to 5,000 req/hr).
   - Enforces security allowlists: automatically filters out `.env`, secrets, binary files, and `node_modules`.
   - Extracts evidence snippets (routes, models, controllers, middleware) to anchor questions in genuine candidate code.

2. **Question Engine (`/api/interviews/start`)**:
   - Generates 6–8 project-specific questions mapped to detected technologies.
   - **Rubric Secrecy Guardrail**: Server-side rubrics and evaluation criteria are strictly stripped before sending question payloads to the client.
   - **Free AI Adapter**: Connects to the **Google Gemini Free API** (`GEMINI_API_KEY`) or Claude (`ANTHROPIC_API_KEY`) when available, and smoothly falls back to deterministic question templates when offline or without keys.

3. **Rubric Evaluation (`/api/interviews/:id/answers` & `/api/interviews/:id/finish`)**:
   - Scores responses across **Correctness (0–5)**, **Technical Reasoning (0–3)**, and **Clarity (0–2)** (Total: 0–10).
   - Prevents double finalization and prevents answering finalized interviews.
   - Handles blank or skipped answers gracefully.

4. **Skill-Gap Engine (`/api/assessments/:id`)**:
   - Aggregates scores by skill, normalizes to 0–100%, and computes gaps against internal benchmarks:
     $$\text{Gap} = \max(0, \text{Target Benchmark} - \text{Assessed Score})$$
   - Distinguishes assessed skills from unassessed skills (never marks unassessed as zero/failed).

5. **Personalized Roadmap (`/api/roadmap` & `/api/roadmap/tasks/:id`)**:
   - Curated skill prerequisite catalog arranged in a Directed Acyclic Graph (DAG).
   - Resolves dependencies (e.g. JWT Auth requires Express Middleware and REST API foundations).
   - Tracks task completion (`pending` $\rightarrow$ `completed`) and automatically recalculates progress percentage.

6. **Dashboard & SkillStock (`/api/dashboard`)**:
   - Provides summary metrics, Chart.js dataset arrays, and SkillStock trends between assessment attempts.
   - If $< 2$ assessments exist, explicitly shows `"Not enough history"`.

---

## 2. API Contract Checklist

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Server health check and uptime | No |
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Log in & set HttpOnly cookie | No |
| `POST` | `/api/auth/logout` | Log out & clear cookie | No |
| `GET` | `/api/auth/me` | Fetch current user profile | Yes |
| `POST` | `/api/repos/analyze` | Analyze public GitHub repository | Yes |
| `GET` | `/api/repos` | List analyzed repositories for user | Yes |
| `GET` | `/api/repos/:id` | Get repository details & evidence | Yes |
| `POST` | `/api/interviews/start` | Start interview session (hidden rubrics) | Yes |
| `POST` | `/api/interviews/:id/answers` | Submit answer for a question | Yes |
| `POST` | `/api/interviews/:id/finish` | Finalize interview & evaluate results | Yes |
| `GET` | `/api/assessments/:id` | View detailed assessment & skill gaps | Yes |
| `GET` | `/api/assessments` | List all assessments for user | Yes |
| `GET` | `/api/roadmap` | View personalized learning roadmap | Yes |
| `PATCH` | `/api/roadmap/tasks/:id` | Update roadmap task status | Yes |
| `GET` | `/api/dashboard` | Dashboard analytics & SkillStock trend | Yes |

---

## 3. Environment Variables Setup

Create a `.env` file in `backend/` (or copy from `.env.example`):

```bash
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3000

# MongoDB Database (Atlas URI or Local)
MONGODB_URI=mongodb://localhost:27017/devmirror

# Authentication & Security
JWT_SECRET=devmirror_super_secret_jwt_key_at_least_32_characters
JWT_EXPIRES_IN=7d
COOKIE_SECRET=devmirror_cookie_signing_secret

# Free API Keys
# GitHub Personal Access Token (Free - increases rate limit from 60 to 5,000 req/hr)
GITHUB_TOKEN=

# Google Gemini Free API Key (Free tier from Google AI Studio)
GEMINI_API_KEY=

# Optional Anthropic API Key
ANTHROPIC_API_KEY=
```

---

## 4. How to Run & Test

### Run Automated Tests (Jest & In-Memory MongoDB)
```bash
cd backend
npm test
```
All 20 integration tests will run with zero external database dependencies!

### Run Development Server
```bash
cd backend
npm run dev
# or
npm start
```

---

## 5. College Demo Script (Step-by-Step Walkthrough)

### Step 1: Server Health Check
```bash
curl -X GET http://localhost:5000/api/health
```
**Expected Response**: `{"status":"ok","timestamp":"...","uptime":...}`

### Step 2: Register a Candidate
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alex Developer",
    "email": "alex@example.com",
    "password": "Password123!",
    "targetRole": "Full Stack Developer"
  }'
```

### Step 3: Analyze a Public GitHub Repository
```bash
curl -X POST http://localhost:5000/api/repos/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"url": "https://github.com/expressjs/express"}'
```

### Step 4: Start an Interview (Verifying Hidden Rubrics)
```bash
curl -X POST http://localhost:5000/api/interviews/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"repositoryId": "<REPO_ID>"}'
```
*Note that questions are returned with skills and source files, but rubrics remain strictly hidden on the server.*

### Step 5: Submit an Answer
```bash
curl -X POST http://localhost:5000/api/interviews/<INTERVIEW_ID>/answers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "questionId": "<QUESTION_ID>",
    "answerText": "We use next(err) in Express middleware to propagate unexpected errors to a centralized error handling middleware."
  }'
```

### Step 6: Finalize Interview & View Assessment
```bash
curl -X POST http://localhost:5000/api/interviews/<INTERVIEW_ID>/finish \
  -H "Authorization: Bearer <TOKEN>"
```

### Step 7: View Personalized Roadmap & Update Task Progress
```bash
# Get Roadmap
curl -X GET http://localhost:5000/api/roadmap \
  -H "Authorization: Bearer <TOKEN>"

# Complete a Task
curl -X PATCH http://localhost:5000/api/roadmap/tasks/jwt_auth \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"status": "completed"}'
```
