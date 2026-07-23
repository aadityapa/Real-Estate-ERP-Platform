import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateESignRequestDto {
  @IsString()
  documentId!: string;

  @IsOptional()
  @IsString()
  agreementId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  signerName!: string;

  @IsOptional()
  @IsEmail()
  signerEmail?: string;
}

export class FilterESignDto {
  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
