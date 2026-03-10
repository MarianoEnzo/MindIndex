import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { Observable } from 'rxjs';
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
    this.model =
      this.config.get<string>('rag.anthropicModel') ?? 'claude-sonnet-4-5';
  }

  streamChat(
    query: string,
    collectionId: string,
    topK = 5,
  ): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const emit = (data: object) =>
        subscriber.next({ data } as MessageEvent);

      (async () => {
        try {
          emit({ step: 'embedding', status: 'processing', message: 'Generating query embedding...' });
          const chunks = await this.retrievalService.search(query, topK, collectionId);
          emit({ step: 'embedding', status: 'done', message: 'Query embedding generated' });

          emit({ step: 'retrieval', status: 'processing', message: 'Searching similar chunks...' });
          const topSimilarity = chunks[0]?.similarity ?? 0;
          emit({
            step: 'retrieval',
            status: 'done',
            message: `Retrieved ${chunks.length} chunks`,
            topSimilarity: Math.round(topSimilarity * 1000) / 1000,
            chunks: chunks.map((c) => ({
              id: c.id,
              pageNumber: c.pageNumber,
              similarity: Math.round(c.similarity * 1000) / 1000,
              preview: c.content.slice(0, 100),
            })),
          });

          const context = chunks.map((c) => c.content).join('\n\n---\n\n');
          emit({ step: 'claude', status: 'processing', message: 'Sending context to Claude...' });

          const response = await this.anthropic.messages.create({
            model: this.model,
            max_tokens: 1024,
            system: `You are a helpful assistant. Answer using only the provided context below. If the answer is not in the context, say you don't know.\n\nContext:\n${context}\n\n---\nCRITICAL INSTRUCTION: You MUST respond in the exact same language as the user's question. If the user asks in English, respond in English. If the user asks in Spanish, respond in Spanish. The language of the context documents is irrelevant — match the user's language exactly.`,
            messages: [{ role: 'user', content: query }],
          });

          const block = response.content[0];
          const answer = block.type === 'text' ? block.text : '';

          emit({
            step: 'claude',
            status: 'done',
            message: 'Response ready',
            answer,
            sources: chunks.map((c) => ({
              id: c.id,
              pageNumber: c.pageNumber,
              similarity: Math.round(c.similarity * 1000) / 1000,
              content: c.content,
            })),
          });

          subscriber.complete();
        } catch (error) {
          this.logger.error('streamChat error', error);
          subscriber.error(error);
        }
      })();
    });
  }

  async chat(query: string, collectionId: string, topK = 5): Promise<string> {
    const chunks = await this.retrievalService.search(
      query,
      topK,
      collectionId,
    );
    const context = chunks.map((c) => c.content).join('\n\n---\n\n');

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: `You are a helpful assistant. Answer using only the provided context below. If the answer is not in the context, say you don't know.\n\nContext:\n${context}\n\n---\nCRITICAL INSTRUCTION: You MUST respond in the exact same language as the user's question. If the user asks in English, respond in English. If the user asks in Spanish, respond in Spanish. The language of the context documents is irrelevant — match the user's language exactly.`,
        messages: [{ role: 'user', content: query }],
      });

      const block = response.content[0];
      return block.type === 'text' ? block.text : '';
    } catch (error) {
      this.logger.error('Failed to get chat response from Anthropic', error);
      throw new InternalServerErrorException(
        'Failed to generate chat response',
      );
    }
  }
}
