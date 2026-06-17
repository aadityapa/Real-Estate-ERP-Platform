import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum StatusDto {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
}

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsString()
  rera?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;
}

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsString()
  rera?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(StatusDto)
  status?: StatusDto;
}

export class FilterCompanyDto extends PaginationDto {
  @IsOptional()
  @IsEnum(StatusDto)
  status?: StatusDto;
}
