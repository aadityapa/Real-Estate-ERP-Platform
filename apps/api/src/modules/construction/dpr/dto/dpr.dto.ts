import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum DPRStatusDto {
  DRAFT = "DRAFT", SUBMITTED = "SUBMITTED", APPROVED = "APPROVED", REJECTED = "REJECTED",
}

export class CreateDprDto {
  @IsString() @IsNotEmpty() projectId!: string;
  @IsOptional() @IsString() milestoneId?: string;
  @IsDateString() reportDate!: string;
  @IsString() @IsNotEmpty() engineerId!: string;
  @IsObject() activities!: Record<string, unknown>;
  @IsOptional() @IsObject() labour?: Record<string, unknown>;
  @IsOptional() @IsObject() materials?: Record<string, unknown>;
  @IsOptional() @IsString() weather?: string;
  @IsOptional() @IsString() issues?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) photos?: string[];
}

export class UpdateDprDto {
  @IsOptional() @IsObject() activities?: Record<string, unknown>;
  @IsOptional() @IsObject() labour?: Record<string, unknown>;
  @IsOptional() @IsObject() materials?: Record<string, unknown>;
  @IsOptional() @IsString() weather?: string;
  @IsOptional() @IsString() issues?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) photos?: string[];
  @IsOptional() @IsEnum(DPRStatusDto) status?: DPRStatusDto;
}

export class FilterDprDto extends PaginationDto {
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsEnum(DPRStatusDto) status?: DPRStatusDto;
}
