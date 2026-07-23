import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "../../../../common/utils/upload-safety";

export enum DocumentCategoryDto {
  LAND = "LAND", AGREEMENT = "AGREEMENT", APPROVAL = "APPROVAL", DRAWING = "DRAWING",
  BLUEPRINT = "BLUEPRINT", LEGAL = "LEGAL", REGISTRATION = "REGISTRATION", OTHER = "OTHER",
}

const ALLOWED_MIME_LIST = [...ALLOWED_UPLOAD_MIME_TYPES];

export class CreateDocumentDto {
  @IsOptional() @IsString() projectId?: string;
  @IsEnum(DocumentCategoryDto) category!: DocumentCategoryDto;
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() @IsNotEmpty() fileUrl!: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_UPLOAD_BYTES)
  fileSize?: number;
  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_MIME_LIST, { message: "mimeType is not an allowed upload type" })
  mimeType?: string;
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
