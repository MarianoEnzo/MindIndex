import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { EmbeddingsService } from '../embeddings/embedding.service';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private embeddingService: EmbeddingsService,
  ) {}

  async createCollection(name: string, description?: string) {
    return this.prisma.collection.create({
      data: { name, description },
    });
  }

  async getCollections() {
    return this.prisma.collection.findMany({
      include: {
        _count: {
          select: {
            documents: true,
          },
        },
        documents: {
          select: {
            chunkCount: true,
          },
        },
      },
    });
  }

  async getCollection(id: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: {
        _count: { select: { documents: true } },
        documents: { select: { chunkCount: true } },
      },
    });
    if (!collection) {
      throw new NotFoundException(`Collection ${id} not found`);
    }
    return collection;
  }

  async getCollectionDocuments(collectionId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }
    return this.prisma.document.findMany({
      where: { collectionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async processDocument(
    file: { originalname: string; buffer: Buffer },
    collectionId: string,
  ) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }

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

      if (numPages === 0) {
        throw new BadRequestException('PDF has no pages');
      }

      const pages: { pageNumber: number; text: string }[] = [];
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const pageText = (content.items ?? [])
          .map((item: { str?: string; hasEOL?: boolean }) =>
            (item.str ?? '') + (item.hasEOL ? '\n' : (item.str?.endsWith(' ') ? '' : ' ')),
          )
          .join('');
        if (pageText.trim()) {
          pages.push({ pageNumber: i, text: pageText });
        }
      }

      if (pages.length === 0) {
        throw new BadRequestException('PDF contains no extractable text');
      }

      const chunks = this.chunkText(pages);

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

      await this.embeddingService.generateForDocument(document.id);

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
      this.logger.error('Failed to process document', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to process document');
    }
  }

  async regenerateEmbeddings(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    this.logger.log(`Regenerating embeddings for document ${documentId}`);
    return this.embeddingService.generateForDocument(documentId);
  }

  private chunkText(pages: { pageNumber: number; text: string }[]) {
    const chunkSize = this.config.get<number>('rag.chunking.size') ?? 500;
    const overlap = this.config.get<number>('rag.chunking.overlap') ?? 100;

    const tokens: { word: string; pageNumber: number }[] = [];
    for (const { pageNumber, text } of pages) {
      for (const word of text.split(/\s+/).filter(Boolean)) {
        tokens.push({ word, pageNumber });
      }
    }

    const chunks: {
      content: string;
      pageNumber: number;
      position: number;
      tokenCount: number;
    }[] = [];

    let i = 0;
    let position = 0;

    while (i < tokens.length) {
      const slice = tokens.slice(i, i + chunkSize);
      if (slice.length < 20) break;

      chunks.push({
        content: slice.map((t) => t.word).join(' '),
        pageNumber: slice[0].pageNumber,
        position: position++,
        tokenCount: Math.ceil(slice.length * 1.3),
      });

      i += chunkSize - overlap;
    }

    return chunks;
  }
}
