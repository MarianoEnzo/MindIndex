import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  collectionId: string;
}
