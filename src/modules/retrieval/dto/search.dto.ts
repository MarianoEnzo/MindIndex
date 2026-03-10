import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class SearchDto {
  @ApiProperty({
    description: 'Natural language query to search for semantically similar chunks',
    example: 'What are the contract termination conditions?',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  query: string;

  @ApiProperty({
    description: 'UUID of the collection to search within',
    example: 'ac8cab63-d03d-4e81-aa02-f4cad7cef003',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  collectionId: string;

  @ApiPropertyOptional({
    description: 'Maximum number of chunks to return (1-20)',
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
