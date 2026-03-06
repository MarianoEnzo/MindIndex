import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async createCollection(name: string, description?: string) {
    return this.prisma.collection.create({
      data: { name, description },
    });
  }

  async processDocument(file: { originalname: string; buffer: Buffer }, collectionId: string) {
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');

    const document = await this.prisma.document.create({
      data: {
        filename: file.originalname,
        pageCount: 0,
        collectionId,
        status: 'PROCESSING',
      },
    });

    try {
      const data = new Uint8Array(file.buffer);
      const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
      const numPages = pdfDoc.numPages;

      let fullText = '';
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: { str: string }) => item.str).join(' ');
        fullText += pageText + ' ';
      }

      const chunks = this.chunkText(fullText, numPages);

      await this.prisma.chunk.createMany({
        data: chunks.map((chunk) => ({
          content: chunk.content,
          pageNumber: chunk.pageNumber,
          position: chunk.position,
          tokenCount: chunk.tokenCount,
          documentId: document.id,
        })),
      });

      await this.prisma.document.update({
        where: { id: document.id },
        data: {
          pageCount: numPages,
          chunkCount: chunks.length,
          status: 'COMPLETED',
        },
      });

      return {
        documentId: document.id,
        pageCount: numPages,
        chunkCount: chunks.length,
      };
    } catch (error) {
      await this.prisma.document.update({
        where: { id: document.id },
        data: { status: 'FAILED' },
      });
      this.logger.error(`Failed to process ${file.originalname}`, error);
      throw error;
    }
  }

  private chunkText(text: string, totalPages: number) {
    const chunkSize = this.config.get<number>('rag.chunking.size') ?? 500;
    const overlap = this.config.get<number>('rag.chunking.overlap') ?? 50;
    const chunks: { content: string; pageNumber: number; position: number; tokenCount: number }[] = [];
    const words = text.split(/\s+/).filter(Boolean);
    let position = 0;

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const slice = words.slice(i, i + chunkSize);
      if (slice.length < 20) break;

      const content = slice.join(' ');
      const estimatedPage = Math.min(
        Math.ceil(((i / words.length) * totalPages) || 1),
        totalPages,
      );

      chunks.push({
        content,
        pageNumber: estimatedPage,
        position: position++,
        tokenCount: Math.ceil(slice.length * 1.3),
      });
    }

    return chunks;
  }
}