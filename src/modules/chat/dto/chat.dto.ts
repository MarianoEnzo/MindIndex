import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class ChatDto {
  @ApiProperty({
    description: 'The question to ask against the collection',
    example: 'What are the main themes in this document?',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  query: string;

  @ApiProperty({
    description: 'UUID of the collection to query against',
    example: 'ac8cab63-d03d-4e81-aa02-f4cad7cef003',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  collectionId: string;

  @ApiPropertyOptional({
    description: 'Number of document chunks to retrieve for context (1-20)',
    example: 5,
    minimum: 1,
    maximum: 20,
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;
}
