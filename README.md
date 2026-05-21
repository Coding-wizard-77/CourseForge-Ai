# CourseForge AI

CourseForge AI turns any topic prompt into a personalized mini-course with AI planning, YouTube research, transcript ranking, quizzes, notes, progress tracking, and a lesson chat assistant.

## Stack

- `client/`: Next.js, React, Tailwind CSS, Framer Motion, React Query, Zustand, shadcn-style components
- `server/`: Express.js, TypeScript, Google Gemini API via `@google/genai`, YouTube Data API, PostgreSQL-ready repository, local vector fallback

The app runs in demo mode without API keys. Add real keys to unlock live Gemini and YouTube orchestration.

## Quick Start

```bash
npm install
cp client/.env.example client/.env.local
cp server/.env.example server/.env
npm run dev
```

Frontend: https://courseforge-ai-frontend.onrender.com
Backend: https://courseforge-ai-yrh6.onrender.com

## Optional Services

```bash
# server/.env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
GEMINI_ADVANCED_MODEL=gemini-2.5-pro
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_DIMENSIONS=768 # set to match Pinecone index dimension
GEMINI_API_VERSION=v1beta
GEMINI_TIMEOUT_MS=30000
YOUTUBE_API_KEY=...
DATABASE_URL=postgres://user:password@host:5432/courseforge
PINECONE_API_KEY=...
PINECONE_INDEX=courseforge
PINECONE_NAMESPACE=courseforge
```

If `DATABASE_URL` is omitted, the backend uses an in-memory repository. If Pinecone is omitted, embeddings are stored in `server/data/vector-store.json`.
For Pinecone, create the index with the same dimension as `GEMINI_EMBEDDING_DIMENSIONS`; the default `768` keeps storage and query cost low.

## Backend Infrastructure

The server validates configuration and external services at startup. Run the same checks manually with:

```bash
npm run test:infra --workspace server
```

Prisma 7 uses `server/prisma.config.ts` and generates the ESM client into `server/src/generated/prisma`. Useful commands:

```bash
npm run prisma:validate --workspace server
npm run prisma:generate --workspace server
npm run db:push --workspace server
npm run prisma:studio --workspace server -- --browser none --port 5555
```

Diagnostics are also available at `GET /api/diagnostics`.

## Render Backend Deploy

Use these commands for the backend service on Render:

```bash
# Build Command
npm install && npm run prisma:generate --workspace server && npm run build --workspace server

# Start Command
npm run start --workspace server
```

The backend TypeScript config writes compiled JavaScript to `server/dist`, and `server/package.json` starts the compiled entrypoint with `node dist/index.js`.

Set these Render environment variables for deployed auth and API calls:

```bash
# Frontend service
NEXT_PUBLIC_API_URL=https://courseforge-ai-yrh6.onrender.com

# Backend service
CLIENT_ORIGIN=https://courseforge-ai-frontend.onrender.com
GOOGLE_OAUTH_REDIRECT_URI=https://courseforge-ai-yrh6.onrender.com/api/auth/google/callback
```

## API Highlights

- `POST /api/course/create`
- `GET /api/course/:id`
- `GET /api/course/user/:userId`
- `GET /api/videos/:moduleId`
- `GET /api/quiz/:videoId`
- `POST /api/quiz/submit`
- `POST /api/chat/lesson`
- `POST /api/progress/update`
- `GET /api/diagnostics`

## Architecture

```text
User Prompt
  -> Gemini Provider Layer
  -> Course Planner Agent
  -> YouTube Research Agent
  -> Transcript Extraction
  -> Gemini Embedding/RAG Agent
  -> Semantic Video Ranking
  -> Course Builder
  -> Quiz + Summary Agents
  -> Personalization Agent
  -> Next.js Learning UI
```
