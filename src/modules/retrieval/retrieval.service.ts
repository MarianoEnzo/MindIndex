import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/common/prisma.service';
import { ChunkResult } from 'src/common/types/chunk-result.type';
import { EmbeddingsService } from '../embeddings/embedding.service';

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingsService,
    private config: ConfigService,
  ) {}

  async search(
    query: string,
    topK: number,
    collectionId: string,
  ): Promise<ChunkResult[]> {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }

    const resolvedTopK =
      topK ?? this.config.get<number>('rag.retrieval.topK') ?? 5;
    const threshold =
      this.config.get<number>('rag.retrieval.similarityThreshold') ?? 0.3;

    const vector = await this.embeddingService.generateSingle(query);
    const vectorStr = `[${vector.join(',')}]`;

    const results: ChunkResult[] = await this.prisma.$queryRawUnsafe(
      `SELECT c.id, c.content, c.page_number as "pageNumber", 1 - (c.embedding <=> $1::vector) as similarity
       FROM chunks c
       JOIN documents d ON c.document_id = d.id
       WHERE d.collection_id = $2
       AND c.embedding IS NOT NULL
       AND 1 - (c.embedding <=> $1::vector) >= $4
       ORDER BY c.embedding <=> $1::vector
       LIMIT $3`,
      vectorStr,
      collectionId,
      resolvedTopK,
      threshold,
    );

    this.logger.log(
      `Search in collection ${collectionId}: ${results.length} results (topK=${resolvedTopK}, threshold=${threshold})`,
    );
    return results as ChunkResult[];
  }
}
