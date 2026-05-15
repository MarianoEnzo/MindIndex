<h1 align="center">
  <br>
  🧠 MindIndex
  <br>
</h1>

<h4 align="center">A production-ready RAG backend for intelligent document search and AI-powered chat.</h4>

<p align="center">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-pgvector-336791?style=flat-square&logo=postgresql&logoColor=white" />
  <img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-Embeddings-412991?style=flat-square&logo=openai&logoColor=white" />
  <img alt="Anthropic" src="https://img.shields.io/badge/Anthropic-Claude-D97757?style=flat-square&logo=anthropic&logoColor=white" />
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#configuration">Configuration</a>
</p>

---

## Overview

MindIndex is a backend service that turns your PDF documents into a searchable knowledge base. Upload documents, ask questions, and get AI-powered answers grounded in your own content — not hallucinations.

Built on **NestJS**, it uses **OpenAI** to generate vector embeddings stored in **PostgreSQL with pgvector**, and **Anthropic Claude** to synthesize accurate answers from retrieved context.

## Features

- **PDF Ingestion** — Upload PDFs and automatically extract, chunk, and embed their content
- **Semantic Search** — Find relevant passages using cosine similarity over pgvector
- **AI Chat** — Get answers from Claude grounded in your document collection
- **Streaming** — Real-time SSE streaming for chat responses with step-by-step progress events
- **Collections** — Organize documents into named collections
- **Swagger UI** — Interactive API documentation out of the box
- **Rate Limiting** — Built-in throttling (100 req/60s)

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐
│  PDF Upload  │───▶│  Ingestion   │───▶│  OpenAI Embeddings  │
└─────────────┘    └──────────────┘    └──────────┬──────────┘
                                                   │
                                        ┌──────────▼──────────┐
                                        │  PostgreSQL+pgvector │
                                        └──────────┬──────────┘
                                                   │
┌─────────────┐    ┌──────────────┐    ┌──────────▼──────────┐
│    Client   │───▶│     Chat     │◀───│  Vector Retrieval   │
└─────────────┘    └──────┬───────┘    └─────────────────────┘
                          │
               ┌──────────▼──────────┐
               │   Anthropic Claude  │
               └─────────────────────┘
```

| Module | Responsibility |
|--------|---------------|
| `ingestion` | PDF parsing, text chunking, collection management |
| `embeddings` | Batch embedding generation via OpenAI |
| `retrieval` | Cosine similarity search with pgvector |
| `chat` | RAG-powered answers with optional SSE streaming |

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL with pgvector)
- OpenAI API key
- Anthropic API key

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/mindindex-backend.git
cd mindindex-backend

# Install dependencies
npm install

# Start PostgreSQL with pgvector
docker-compose up -d

# Set up environment variables
cp .env.example .env
# → fill in your API keys and DATABASE_URL

# Run database migrations
npx prisma migrate dev

# Start the development server
npm run start:dev
```

The server starts on `http://localhost:3000`. Swagger docs are available at `http://localhost:3000/docs`.

## API Reference

### Collections

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ingestion/collections` | Create a new collection |
| `GET` | `/ingestion/collections` | List all collections |
| `GET` | `/ingestion/collections/:id` | Get collection details |
| `GET` | `/ingestion/collections/:id/documents` | List documents in a collection |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ingestion/upload` | Upload a PDF (multipart, max 10MB) |
| `POST` | `/ingestion/documents/:id/reembed` | Regenerate embeddings for a document |

### Search & Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/retrieval/search` | Semantic search over a collection |
| `POST` | `/chat` | Chat with context (single response) |
| `POST` | `/chat/stream` | Chat with SSE streaming |

### Example: Upload a PDF

```bash
curl -X POST http://localhost:3000/ingestion/upload \
  -F "file=@document.pdf" \
  -F "collectionId=<uuid>"
```

### Example: Ask a question

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the main conclusions?",
    "collectionId": "<uuid>"
  }'
```

## Configuration

All configuration is driven by environment variables. Copy `.env.example` to `.env` and fill in the values.

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string **(required)** |
| `OPENAI_API_KEY` | — | OpenAI API key for embeddings **(required)** |
| `ANTHROPIC_API_KEY` | — | Anthropic API key for chat **(required)** |
| `PORT` | `3000` | Server port |
| `CORS_ORIGIN` | `http://localhost:3001` | Allowed CORS origin |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` | Claude model to use |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | OpenAI embedding model |
| `EMBEDDING_DIMENSIONS` | `1536` | Embedding vector dimensions |
| `CHUNK_SIZE` | `500` | Token size per chunk |
| `CHUNK_OVERLAP` | `50` | Overlapping tokens between chunks |
| `RETRIEVAL_TOP_K` | `10` | Max chunks retrieved per query |
| `SIMILARITY_THRESHOLD` | `0.3` | Minimum similarity score (0–1) |

## Development

```bash
npm run start:dev     # Watch mode
npm run lint          # Lint + auto-fix
npm run format        # Format with Prettier
npm test              # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:cov      # Coverage report
npm run build         # Compile to dist/
```

## Tech Stack

- **[NestJS](https://nestjs.com/)** — Node.js framework
- **[Prisma](https://www.prisma.io/)** — ORM with PostgreSQL
- **[pgvector](https://github.com/pgvector/pgvector)** — Vector similarity search
- **[OpenAI SDK](https://github.com/openai/openai-node)** — Text embeddings
- **[Anthropic SDK](https://github.com/anthropics/anthropic-sdk-python)** — Claude chat
- **[pdfjs-dist](https://github.com/mozilla/pdf.js)** — PDF text extraction

---

<p align="center">
  Built with ❤️ using NestJS and the Anthropic Claude API
</p>
