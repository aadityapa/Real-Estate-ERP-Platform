import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export enum VendorTypeDto {
  CONTRACTOR = "CONTRACTOR", SUPPLIER = "SUPPLIER", CONSULTANT = "CONSULTANT",
  ARCHITECT = "ARCHITECT", SUBCONTRACTOR = "SUBCONTRACTOR",
}

export enum StatusDto { ACTIVE = "ACTIVE", INACTIVE = "INACTIVE", ARCHIVED = "ARCHIVED" }

export class CreateVendorDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsEnum(VendorTypeDto) type!: VendorTypeDto;
  @IsOptional() @IsString() gstin?: string;
  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsString() email?: string;
  @IsString() @IsNotEmpty() phone!: string;
  @IsOptional() @IsObject() address?: Record<string, unknown>;
}

export class UpdateVendorDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(VendorTypeDto) type?: VendorTypeDto;
  @IsOptional() @IsString() gstin?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsObject() address?: Record<string, unknown>;
  @IsOptional() @Type(() => Number) @IsNumber() rating?: number;
  @IsOptional() @IsEnum(StatusDto) status?: StatusDto;
}

export class FilterVendorDto extends PaginationDto {
  @IsOptional() @IsEnum(VendorTypeDto) type?: VendorTypeDto;
  @IsOptional() @IsEnum(StatusDto) status?: StatusDto;
}
