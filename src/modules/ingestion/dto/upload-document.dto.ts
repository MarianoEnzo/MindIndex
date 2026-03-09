import { IsNotEmpty, IsString } from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  collectionId: string;
}
