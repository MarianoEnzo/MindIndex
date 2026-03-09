import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { IngestionService } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private ingestionService: IngestionService) {}

  @Post('collections')
  async createCollection(@Body() dto: CreateCollectionDto) {
    return this.ingestionService.createCollection(dto.name, dto.description);
  }

  @Get('collections')
  async getCollections() {
    return this.ingestionService.getCollections();
  }

  @Post('upload')
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
  async regenerateEmbeddings(@Param('id') documentId: string) {
    return this.ingestionService.regenerateEmbeddings(documentId);
  }
}
