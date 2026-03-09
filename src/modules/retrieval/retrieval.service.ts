import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { ChunkResult } from 'src/common/types/chunk-result.type';
import { EmbeddingsService } from '../embeddings/embedding.service';

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingsService,
  ) {}

  async search(query: string, topK: number, collectionId: string): Promise<ChunkResult[]> {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }

    const vector = await this.embeddingService.generateSingle(query);
    const vectorStr = `[${vector.join(',')}]`;

    const results = await this.prisma.$queryRawUnsafe<ChunkResult[]>(
      `SELECT c.id, c.content, 1 - (c.embedding <=> $1::vector) as similarity
       FROM chunks c
       JOIN documents d ON c.document_id = d.id
       WHERE d.collection_id = $2
       AND c.embedding IS NOT NULL
       ORDER BY c.embedding <=> $1::vector
       LIMIT $3`,
      vectorStr,
      collectionId,
      topK,
    );

    this.logger.log(`Search in collection ${collectionId}: ${results.length} results`);
    return results;
  }
}
