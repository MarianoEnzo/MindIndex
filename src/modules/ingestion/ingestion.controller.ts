import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IngestionService } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private ingestionService: IngestionService) {}

  @Post('collections')
  async createCollection(
    @Body() body: { name: string; description?: string },
  ) {
    return this.ingestionService.createCollection(body.name, body.description);
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
}