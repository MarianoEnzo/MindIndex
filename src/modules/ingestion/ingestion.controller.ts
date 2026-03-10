import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { IngestionService } from './ingestion.service';

@ApiTags('Collections')
@Controller('ingestion')
export class IngestionController {
  constructor(private ingestionService: IngestionService) {}

  @Post('collections')
  @ApiOperation({ summary: 'Create a new collection' })
  @ApiOkResponse({ description: 'Collection created successfully' })
  async createCollection(@Body() dto: CreateCollectionDto) {
    return this.ingestionService.createCollection(dto.name, dto.description);
  }

  @Get('collections')
  @ApiOperation({ summary: 'List all collections with document and chunk counts' })
  @ApiOkResponse({ description: 'Array of collections' })
  async getCollections() {
    return this.ingestionService.getCollections();
  }

  @Get('collections/:id')
  @ApiOperation({ summary: 'Get a single collection by ID' })
  @ApiParam({ name: 'id', description: 'Collection UUID' })
  @ApiOkResponse({ description: 'Collection found' })
  @ApiNotFoundResponse({ description: 'Collection not found' })
  async getCollection(@Param('id', ParseUUIDPipe) id: string) {
    return this.ingestionService.getCollection(id);
  }

  @Get('collections/:id/documents')
  @ApiOperation({ summary: 'List all documents in a collection' })
  @ApiParam({ name: 'id', description: 'Collection UUID' })
  @ApiOkResponse({ description: 'Array of documents ordered by newest first' })
  @ApiNotFoundResponse({ description: 'Collection not found' })
  async getCollectionDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.ingestionService.getCollectionDocuments(id);
  }

  @Post('upload')
  @ApiTags('Documents')
  @ApiOperation({
    summary: 'Upload a PDF document into a collection',
    description:
      'Accepts a PDF file (max 10MB), extracts text, splits it into chunks, ' +
      'and generates vector embeddings for semantic search.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'collectionId'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'PDF file (max 10MB)' },
        collectionId: { type: 'string', format: 'uuid', description: 'Target collection UUID' },
      },
    },
  })
  @ApiOkResponse({ description: 'Document processed — returns documentId, pageCount, chunkCount' })
  @ApiNotFoundResponse({ description: 'Collection not found' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new BadRequestException('Only PDF files allowed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: { originalname: string; buffer: Buffer },
    @Body('collectionId') collectionId: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!collectionId) throw new BadRequestException('collectionId required');

    return this.ingestionService.processDocument(file, collectionId);
  }

  @Post('documents/:id/reembed')
  @ApiTags('Documents')
  @ApiOperation({ summary: 'Regenerate embeddings for a document' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiOkResponse({ description: 'Embeddings regenerated successfully' })
  @ApiNotFoundResponse({ description: 'Document not found' })
  async regenerateEmbeddings(@Param('id', ParseUUIDPipe) documentId: string) {
    return this.ingestionService.regenerateEmbeddings(documentId);
  }
}
