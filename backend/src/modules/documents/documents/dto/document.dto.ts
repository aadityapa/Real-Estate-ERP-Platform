import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum DocumentCategoryDto {
  LAND = "LAND", AGREEMENT = "AGREEMENT", APPROVAL = "APPROVAL", DRAWING = "DRAWING",
  BLUEPRINT = "BLUEPRINT", LEGAL = "LEGAL", REGISTRATION = "REGISTRATION", OTHER = "OTHER",
}

export class CreateDocumentDto {
  @IsOptional() @IsString() projectId?: string;
  @IsEnum(DocumentCategoryDto) category!: DocumentCategoryDto;
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() @IsNotEmpty() fileUrl!: string;
  @IsOptional() @Type(() => Number) @IsInt() fileSize?: number;
  @IsOptional() @IsString() mimeType?: string;
  /** SHA-256 hex checksum of the file, computed at upload time */
  @IsOptional() @Matches(/^[a-f0-9]{64}$/i, { message: "checksum must be a SHA-256 hex digest" }) checksum?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsBoolean() isConfidential?: boolean;
  @IsString() @IsNotEmpty() uploadedBy!: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}

export class UpdateDocumentDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() fileUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsBoolean() isConfidential?: boolean;
  @IsOptional() @IsDateString() expiresAt?: string;
}

export class FilterDocumentDto extends PaginationDto {
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsEnum(DocumentCategoryDto) category?: DocumentCategoryDto;
}
