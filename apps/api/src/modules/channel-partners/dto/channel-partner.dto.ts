import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export enum PartnerTypeDto { BROKER = "BROKER", AGENT = "AGENT", INFLUENCER = "INFLUENCER", CORPORATE = "CORPORATE" }
export enum StatusDto { ACTIVE = "ACTIVE", INACTIVE = "INACTIVE", ARCHIVED = "ARCHIVED" }

export class CreateChannelPartnerDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsEnum(PartnerTypeDto) type!: PartnerTypeDto;
  @IsOptional() @IsString() email?: string;
  @IsString() @IsNotEmpty() phone!: string;
  @IsOptional() @IsString() reraNumber?: string;
  @IsOptional() @Type(() => Number) @IsNumber() commissionRate?: number;
}

export class UpdateChannelPartnerDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @Type(() => Number) @IsNumber() commissionRate?: number;
  @IsOptional() @IsObject() address?: Record<string, unknown>;
  @IsOptional() @IsEnum(StatusDto) status?: StatusDto;
}

export class FilterChannelPartnerDto extends PaginationDto {
  @IsOptional() @IsEnum(PartnerTypeDto) type?: PartnerTypeDto;
  @IsOptional() @IsEnum(StatusDto) status?: StatusDto;
}
