import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum ProjectTypeDto {
  RESIDENTIAL = "RESIDENTIAL",
  COMMERCIAL = "COMMERCIAL",
  MIXED = "MIXED",
}

export enum ProjectStatusDto {
  PLANNING = "PLANNING",
  UNDER_CONSTRUCTION = "UNDER_CONSTRUCTION",
  COMPLETED = "COMPLETED",
  ON_HOLD = "ON_HOLD",
}

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsEnum(ProjectTypeDto)
  type!: ProjectTypeDto;

  @IsOptional()
  @IsEnum(ProjectStatusDto)
  status?: ProjectStatusDto;

  @IsOptional()
  @IsObject()
  location?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  reraNumber?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  expectedEnd?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  totalUnits?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalArea?: number;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ProjectTypeDto)
  type?: ProjectTypeDto;

  @IsOptional()
  @IsEnum(ProjectStatusDto)
  status?: ProjectStatusDto;

  @IsOptional()
  @IsObject()
  location?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  reraNumber?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  expectedEnd?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  totalUnits?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalArea?: number;
}

export class FilterProjectDto extends PaginationDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsEnum(ProjectStatusDto)
  status?: ProjectStatusDto;
}
