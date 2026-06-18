import { Type } from "class-transformer";
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum EmployeeStatusDto {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ON_LEAVE = "ON_LEAVE",
  RESIGNED = "RESIGNED",
}

export class CreateEmployeeDto {
  @IsString() @IsNotEmpty() companyId!: string;
  @IsOptional() @IsString() branchId?: string;
  @IsString() @IsNotEmpty() employeeCode!: string;
  @IsString() @IsNotEmpty() firstName!: string;
  @IsString() @IsNotEmpty() lastName!: string;
  @IsEmail() email!: string;
  @IsString() @IsNotEmpty() phone!: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsDateString() dateOfJoining?: string;
  @IsOptional() @Type(() => Number) @IsNumber() salary?: number;
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsEnum(EmployeeStatusDto) status?: EmployeeStatusDto;
  @IsOptional() @Type(() => Number) @IsNumber() salary?: number;
  @IsOptional() @IsObject() address?: Record<string, unknown>;
}

export class FilterEmployeeDto extends PaginationDto {
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsEnum(EmployeeStatusDto) status?: EmployeeStatusDto;
}
