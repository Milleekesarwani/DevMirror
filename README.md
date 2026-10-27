# DevMirror — GitHub-Powered Developer Assessment Platform

This project implements the complete backend architecture for **DevMirror** based on the DevMirror implementation playbook.

## Project Structure

```
FULL STCK PROJECT/
├── backend/
│   ├── config/
│   │   └── db.js                    # MongoDB connection & graceful shutdown
│   ├── controllers/
│   │   ├── authController.js        # Register, Login, Logout, /me
│   │   ├── repoController.js        # Public GitHub repository analyzer
│   │   ├── interviewController.js   # Question generation & answer evaluation
│   │   ├── assessmentController.js  # Skill-gap report & scores
│   │   ├── roadmapController.js     # Curated learning roadmap & task progress
│   │   └── dashboardController.js   # Analytics & SkillStock trends
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT & HttpOnly cookie protection + CSRF
│   │   ├── errorHandler.js         # Centralized error handler (Zod, Mongoose, JWT)
│   │   ├── rateLimiter.js          # Express rate limiters for auth & API
│   │   └── validate.js             # Generic Zod validation wrapper
│   ├── models/
│   │   ├── User.js                 # User schema with bcrypt password hashing
│   │   ├── Repository.js           # Parsed GitHub metadata, tech & evidence
│   │   ├── Interview.js            # Interview sessions & server-side rubrics
│   │   ├── Assessment.js           # Normalized skill scores & benchmark gaps
│   │   └── Roadmap.js              # Personalized learning DAG & task completion
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── repoRoutes.js
│   │   ├── interviewRoutes.js
│   │   ├── assessmentRoutes.js
│   │   ├── roadmapRoutes.js
│   │   └── dashboardRoutes.js
│   ├── services/
│   │   ├── githubService.js        # GitHub REST API client & tech detection
│   │   ├── questionService.js      # Project-grounded question generator
│   │   ├── llmService.js           # Free AI adapter (Google Gemini) & Claude
│   │   ├── evaluationService.js    # Rubric evaluator (correctness, reasoning, clarity)
│   │   ├── skillAnalysisService.js # Normalized skill scoring & gap calculation
│   │   └── roadmapService.js       # DAG topological prerequisite scheduler
│   ├── tests/
│   │   ├── setup.js                # In-memory MongoDB server for testing
│   │   ├── health.test.js          # Health check endpoint tests
│   │   ├── auth.test.js            # Auth, duplicate email, cookie & JWT tests
│   │   ├── repo.test.js            # GitHub URL validation & mock API tests
│   │   ├── interview.test.js       # Question generation, hidden rubrics & answer tests
│   │   └── assessment_roadmap.test.js # Skill-gap, roadmap persistence & dashboard tests
│   ├── app.js                      # Express application assembly
│   ├── server.js                   # Server bootstrap & graceful shutdown
│   ├── package.json                # Dependencies & test scripts
│   ├── .env.example                # Sample environment variables
│   └── README.md                   # Complete backend documentation & demo script
└── .gitignore                      # Secrets & node_modules exclusion
```

## Quick Start

```bash
cd backend
npm install
npm test
npm run dev
```
