import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum AssetTypeDto { MACHINERY = "MACHINERY", VEHICLE = "VEHICLE", EQUIPMENT = "EQUIPMENT", TOOL = "TOOL" }
export enum AssetStatusDto { ACTIVE = "ACTIVE", UNDER_MAINTENANCE = "UNDER_MAINTENANCE", DISPOSED = "DISPOSED" }

export class CreateAssetDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsEnum(AssetTypeDto) type!: AssetTypeDto;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() purchaseValue?: number;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() assignedTo?: string;
}

export class UpdateAssetDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @Type(() => Number) @IsNumber() currentValue?: number;
  @IsOptional() @IsEnum(AssetStatusDto) status?: AssetStatusDto;
  @IsOptional() @IsDateString() nextServiceDate?: string;
}

export class FilterAssetDto extends PaginationDto {
  @IsOptional() @IsEnum(AssetTypeDto) type?: AssetTypeDto;
  @IsOptional() @IsEnum(AssetStatusDto) status?: AssetStatusDto;
}
