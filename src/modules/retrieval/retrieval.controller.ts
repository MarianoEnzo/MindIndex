import { Body, Controller, Post } from '@nestjs/common';
import { SearchDto } from './dto/search.dto';
import { RetrievalService } from './retrieval.service';

@Controller('retrieval')
export class RetrievalController {
  constructor(private retrievalService: RetrievalService) {}

  @Post('search')
  async search(@Body() dto: SearchDto) {
    return this.retrievalService.search(dto.query, dto.topK ?? 5, dto.collectionId);
  }
}
