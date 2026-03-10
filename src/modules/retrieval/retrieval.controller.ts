import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchDto } from './dto/search.dto';
import { RetrievalService } from './retrieval.service';

@ApiTags('Retrieval')
@Controller('retrieval')
export class RetrievalController {
  constructor(private retrievalService: RetrievalService) {}

  @Post('search')
  @ApiOperation({
    summary: 'Semantic search over document chunks',
    description:
      'Generates an embedding for the query and returns the most semantically similar ' +
      'document chunks from the specified collection, ranked by cosine similarity.',
  })
  @ApiOkResponse({
    description: 'Array of matching chunks with similarity scores',
    schema: {
      example: [
        {
          id: 'uuid',
          content: 'The contract shall be governed by...',
          pageNumber: 3,
          similarity: 0.921,
        },
      ],
    },
  })
  async search(@Body() dto: SearchDto) {
    return this.retrievalService.search(dto.query, dto.topK ?? 5, dto.collectionId);
  }
}
