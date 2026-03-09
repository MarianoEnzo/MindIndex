import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private openai: OpenAI;
  private model: string;
  private batchSize: number;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('rag.openaiApiKey'),
    });
    this.model =
      this.config.get<string>('rag.embedding.model') ??
      'text-embedding-3-small';
    this.batchSize = this.config.get<number>('rag.embedding.batchSize') ?? 20;
  }

  async generateForDocument(documentId: string): Promise<{ documentId: string; chunksProcessed: number }> {
    const chunks = await this.prisma.chunk.findMany({
      where: { documentId },
      select: { id: true, content: true },
      orderBy: { position: 'asc' },
    });

    if (chunks.length === 0) {
      throw new NotFoundException(`No chunks found for document ${documentId}`);
    }

    let processed = 0;

    try {
      for (let i = 0; i < chunks.length; i += this.batchSize) {
        const batch = chunks.slice(i, i + this.batchSize);
        const texts = batch.map((c) => c.content);

        const response = await this.openai.embeddings.create({
          model: this.model,
          input: texts,
        });

        const updates = batch.map((chunk, idx) => {
          const vector = response.data[idx].embedding;
          const vectorStr = `[${vector.join(',')}]`;
          return this.prisma.$executeRawUnsafe(
            `UPDATE chunks SET embedding = $1::vector WHERE id = $2`,
            vectorStr,
            chunk.id,
          );
        });

        await Promise.all(updates);
        processed += batch.length;
        this.logger.log(`Embeddings: ${processed}/${chunks.length}`);
      }
    } catch (error) {
      this.logger.error(`Failed to generate embeddings for document ${documentId}`, error);
      throw new InternalServerErrorException('Failed to generate embeddings');
    }

    return { documentId, chunksProcessed: processed };
  }

  async generateSingle(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding', error);
      throw new InternalServerErrorException('Failed to generate embedding');
    }
  }
}
