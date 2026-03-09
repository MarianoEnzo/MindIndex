import { registerAs } from "@nestjs/config";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const ragConfig = registerAs('rag', () => ({
  embedding: {
    model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10),
    batchSize: 20,
  },
  chunking: {
    size: parseInt(process.env.CHUNK_SIZE || '500', 10),
    overlap: parseInt(process.env.CHUNK_OVERLAP || '50', 10),
  },
  retrieval: {
    topK: parseInt(process.env.RETRIEVAL_TOP_K || '5', 10),
    similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.7'),
  },
  openaiApiKey: requireEnv('OPENAI_API_KEY'),
  anthropicApiKey: requireEnv('ANTHROPIC_API_KEY'),
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
}));