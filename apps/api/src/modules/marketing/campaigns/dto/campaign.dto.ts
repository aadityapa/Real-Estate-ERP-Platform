import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum CampaignTypeDto { FACEBOOK = "FACEBOOK", GOOGLE = "GOOGLE", WHATSAPP = "WHATSAPP", SMS = "SMS", EMAIL = "EMAIL" }
export enum CampaignStatusDto { DRAFT = "DRAFT", ACTIVE = "ACTIVE", PAUSED = "PAUSED", COMPLETED = "COMPLETED" }

export class CreateCampaignDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsEnum(CampaignTypeDto) type!: CampaignTypeDto;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() budget?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsObject() targetAudience?: Record<string, unknown>;
  @IsOptional() @IsObject() content?: Record<string, unknown>;
}

export class UpdateCampaignDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @Type(() => Number) @IsNumber() budget?: number;
  @IsOptional() @Type(() => Number) @IsNumber() spent?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsObject() content?: Record<string, unknown>;
  @IsOptional() @IsObject() metrics?: Record<string, unknown>;
  @IsOptional() @IsEnum(CampaignStatusDto) status?: CampaignStatusDto;
}

export class FilterCampaignDto extends PaginationDto {
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsEnum(CampaignStatusDto) status?: CampaignStatusDto;
}
