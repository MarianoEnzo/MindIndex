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

      let fullText = '';
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const pageText = (content.items ?? [])
          .map((item: { str?: string; hasEOL?: boolean }) =>
            (item.str ?? '') + (item.hasEOL ? '\n' : ''),
          )
          .join('');
        fullText += pageText + '\n';
      }

      if (!fullText.trim()) {
        throw new BadRequestException('PDF contains no extractable text');
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

  private chunkText(text: string, totalPages: number) {
    const chunkSize = this.config.get<number>('rag.chunking.size') ?? 500;
    const overlap = this.config.get<number>('rag.chunking.overlap') ?? 100;

    // Split into sentences, preserving the delimiter
    const sentences = text
      .split(/(?<=[.?!])\s+|\n{2,}/)
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter((s) => s.length > 0);

    const chunks: {
      content: string;
      pageNumber: number;
      position: number;
      tokenCount: number;
    }[] = [];

    const totalWords = text.split(/\s+/).filter(Boolean).length;
    let wordsCovered = 0;
    let position = 0;
    let i = 0;

    while (i < sentences.length) {
      const window: string[] = [];
      let wordCount = 0;

      // Build chunk up to chunkSize words
      let j = i;
      while (j < sentences.length) {
        const sentenceWords = sentences[j].split(/\s+/).length;
        if (wordCount + sentenceWords > chunkSize && window.length > 0) break;
        window.push(sentences[j]);
        wordCount += sentenceWords;
        j++;
      }

      if (window.length === 0) break;

      const content = window.join(' ');
      const estimatedPage = Math.min(
        Math.ceil((wordsCovered / totalWords) * totalPages) || 1,
        totalPages,
      );

      chunks.push({
        content,
        pageNumber: estimatedPage,
        position: position++,
        tokenCount: Math.ceil(wordCount * 1.3),
      });

      wordsCovered += wordCount;

      // Step back `overlap` words to create continuity
      let overlapWords = 0;
      let step = j - 1;
      while (step > i && overlapWords < overlap) {
        overlapWords += sentences[step].split(/\s+/).length;
        step--;
      }
      i = Math.max(i + 1, step + 1);
    }

    return chunks;
  }
}
