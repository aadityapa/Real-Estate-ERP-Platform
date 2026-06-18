import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum LegalTypeDto { RERA = "RERA", COURT = "COURT", NOTICE = "NOTICE", REGISTRATION = "REGISTRATION" }
export enum LegalStatusDto { ACTIVE = "ACTIVE", CLOSED = "CLOSED", PENDING = "PENDING", HEARING = "HEARING" }

export class CreateLegalCaseDto {
  @IsOptional() @IsString() projectId?: string;
  @IsEnum(LegalTypeDto) type!: LegalTypeDto;
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsObject() parties?: Record<string, unknown>;
  @IsOptional() @IsDateString() filedDate?: string;
  @IsOptional() @IsDateString() hearingDate?: string;
  @IsOptional() @IsString() assignedTo?: string;
}

export class UpdateLegalCaseDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsObject() parties?: Record<string, unknown>;
  @IsOptional() @IsDateString() hearingDate?: string;
  @IsOptional() @IsEnum(LegalStatusDto) status?: LegalStatusDto;
  @IsOptional() @IsArray() @IsString({ each: true }) documents?: string[];
  @IsOptional() @IsString() notes?: string;
}

export class FilterLegalCaseDto extends PaginationDto {
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsEnum(LegalStatusDto) status?: LegalStatusDto;
}
