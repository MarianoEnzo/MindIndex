import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { RetrievalService } from '../retrieval/retrieval.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private anthropic: Anthropic;

  private model: string;

  constructor(
    private retrievalService: RetrievalService,
    private config: ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get<string>('rag.anthropicApiKey'),
    });
    this.model = this.config.get<string>('rag.anthropicModel') ?? 'claude-sonnet-4-5';
  }

  async chat(query: string, collectionId: string, topK = 5): Promise<string> {
    const chunks = await this.retrievalService.search(query, topK, collectionId);
    const context = chunks.map((c) => c.content).join('\n\n---\n\n');

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: `You are a helpful assistant. Answer the user's question using only the provided context. If the answer is not in the context, say you don't know.\n\nContext:\n${context}`,
        messages: [{ role: 'user', content: query }],
      });

      const block = response.content[0];
      return block.type === 'text' ? block.text : '';
    } catch (error) {
      this.logger.error('Failed to get chat response from Anthropic', error);
      throw new InternalServerErrorException('Failed to generate chat response');
    }
  }
}
