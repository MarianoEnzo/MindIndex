import { Module } from '@nestjs/common';
import { RetrievalModule } from '../retrieval/retriver.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [RetrievalModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
