import { Body, Controller, Post } from '@nestjs/common';
import { ChatDto } from './dto/chat.dto';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  async chat(@Body() dto: ChatDto) {
    const answer = await this.chatService.chat(dto.query, dto.collectionId, dto.topK);
    return { answer };
  }
}
