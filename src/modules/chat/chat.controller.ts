import { Body, Controller, Post, Res } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ChatDto } from './dto/chat.dto';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  @ApiOperation({
    summary: 'Ask a question against a collection',
    description:
      'Retrieves semantically relevant document chunks and sends them as context to Claude. ' +
      'Returns a single answer string.',
  })
  @ApiOkResponse({ description: 'AI-generated answer', schema: { example: { answer: 'The contract expires on December 31st.' } } })
  async chat(@Body() dto: ChatDto) {
    const answer = await this.chatService.chat(dto.query, dto.collectionId, dto.topK);
    return { answer };
  }

  @Post('stream')
  @ApiOperation({
    summary: 'Ask a question with real-time SSE progress events',
    description:
      'Same as POST /chat but streams progress as Server-Sent Events over the HTTP response. ' +
      'Events are emitted for each processing step: `embedding`, `retrieval`, and `claude`. ' +
      'Consume with `fetch` + `ReadableStream` (not `EventSource`, which only supports GET).\n\n' +
      '**Event sequence:**\n' +
      '1. `{ step: "embedding", status: "processing" }`\n' +
      '2. `{ step: "embedding", status: "done" }`\n' +
      '3. `{ step: "retrieval", status: "processing" }`\n' +
      '4. `{ step: "retrieval", status: "done", chunks: [...] }`\n' +
      '5. `{ step: "claude", status: "processing" }`\n' +
      '6. `{ step: "claude", status: "done", answer: "...", sources: [...] }`',
  })
  @ApiProduces('text/event-stream')
  @ApiBody({ type: ChatDto })
  @ApiOkResponse({ description: 'Stream of SSE events (text/event-stream)' })
  stream(@Body() dto: ChatDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    this.chatService.streamChat(dto.query, dto.collectionId, dto.topK).subscribe({
      next: (event) => res.write(`data: ${JSON.stringify((event as any).data)}\n\n`),
      error: (err) => {
        res.write(`data: ${JSON.stringify({ step: 'error', message: err.message })}\n\n`);
        res.end();
      },
      complete: () => res.end(),
    });
  }
}
