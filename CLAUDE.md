# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

RAG (Retrieval-Augmented Generation) backend built with NestJS. Ingests PDFs, generates vector embeddings via OpenAI, stores them in PostgreSQL with pgvector, and answers questions using Anthropic Claude with retrieved context.

## Commands

```bash
# Development
npm run start:dev       # Watch mode
npm run start:debug     # With debugger

# Build & Production
npm run build           # Compile TypeScript to dist/
npm run start:prod      # Run compiled dist/main.js

# Code Quality
npm run lint            # ESLint with auto-fix
npm run format          # Prettier

# Testing
npm test                # Unit tests (Jest)
npm run test:watch      # Watch mode
npm run test:cov        # With coverage
npm run test:e2e        # End-to-end tests

# Database
npx prisma migrate dev  # Apply migrations + regenerate client
npx prisma studio       # GUI for the database
```

## Infrastructure

PostgreSQL with pgvector runs via Docker:

```bash
docker-compose up -d    # Starts pgvector/pgvector:pg16 on port 5432
```

Required `.env` variables: `DATABASE_URL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`. See `.env.example` for all options.

## Architecture

Four NestJS feature modules, each self-contained:

```
ingestion → embeddings → [database: pgvector]
                              ↓
retrieval ← (vector search) ←┘
    ↓
chat → Anthropic Claude API
```

| Module | Responsibility |
|--------|---------------|
| `ingestion` | PDF upload, text extraction, chunking, collection management |
| `embeddings` | Batch embedding via OpenAI (`text-embedding-3-small`, 1536 dims) |
| `retrieval` | Cosine similarity search with pgvector (`embedding <=>`) |
| `chat` | Claude-powered answers with RAG context; supports SSE streaming |

## Data Model

Three Prisma models: `Collection → Document → Chunk`. Chunks hold the `vector(1536)` embedding column. Vector search runs as raw SQL via `$queryRaw`.

## Key Files

- `src/main.ts` — Bootstrap, Swagger at `/docs`, CORS, rate limiting (100 req/60s)
- `src/common/config/reg.config.ts` — All env vars with defaults and validation
- `src/common/prisma.service.ts` — PrismaClient with pgvector extension
- `prisma/schema.prisma` — Data model source of truth

## Conventions

- Config always injected via `ConfigService.get('rag.keyName')` — never `process.env` directly in services
- DTOs use `class-validator` decorators; Swagger decorators (`@ApiProperty`) are mandatory on all DTO fields
- Errors throw NestJS HTTP exceptions (`NotFoundException`, `BadRequestException`, etc.) — never raw `throw new Error()`
- Document processing status flows: `PENDING → PROCESSING → COMPLETED | FAILED`
- Chat streaming uses RxJS `Observable` + SSE (`res.write`) — events emit `{step, status, message}`
