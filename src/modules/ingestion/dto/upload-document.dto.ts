import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({
    description: 'UUID of the collection to upload the document into',
    example: 'ac8cab63-d03d-4e81-aa02-f4cad7cef003',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  collectionId: string;
}
