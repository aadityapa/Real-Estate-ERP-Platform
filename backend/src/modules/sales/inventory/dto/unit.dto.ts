import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum UnitTypeDto {
  FLAT = "FLAT",
  VILLA = "VILLA",
  PLOT = "PLOT",
  COMMERCIAL = "COMMERCIAL",
  SHOP = "SHOP",
  PENTHOUSE = "PENTHOUSE",
}

export enum UnitStatusDto {
  AVAILABLE = "AVAILABLE",
  RESERVED = "RESERVED",
  BOOKED = "BOOKED",
  SOLD = "SOLD",
  BLOCKED = "BLOCKED",
  UNDER_CONSTRUCTION = "UNDER_CONSTRUCTION",
}

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsOptional()
  @IsString()
  towerId?: string;

  @IsOptional()
  @IsString()
  buildingId?: string;

  @IsString()
  @IsNotEmpty()
  unitNumber!: string;

  @IsEnum(UnitTypeDto)
  type!: UnitTypeDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bathrooms?: number;

  @Type(() => Number)
  @IsNumber()
  area!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  carpetArea?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  builtupArea?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  superArea?: number;

  @IsOptional()
  @IsString()
  facing?: string;

  @Type(() => Number)
  @IsNumber()
  basePrice!: number;

  @Type(() => Number)
  @IsNumber()
  totalPrice!: number;

  @IsOptional()
  @IsObject()
  premiums?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsEnum(UnitStatusDto)
  status?: UnitStatusDto;

  @IsOptional()
  @IsString()
  floor_plan?: string;
}

export class UpdateUnitDto {
  @IsOptional()
  @IsString()
  unitNumber?: string;

  @IsOptional()
  @IsEnum(UnitTypeDto)
  type?: UnitTypeDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bathrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  area?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  basePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalPrice?: number;

  @IsOptional()
  @IsEnum(UnitStatusDto)
  status?: UnitStatusDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}

export class FilterUnitDto extends PaginationDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsEnum(UnitStatusDto)
  status?: UnitStatusDto;
}
