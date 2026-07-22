import { IsBoolean, IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export class CreateCustomerDto {
  @IsString() @IsNotEmpty() firstName!: string;
  @IsString() @IsNotEmpty() lastName!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() @IsNotEmpty() phone!: string;
  @IsOptional() @IsString() alternatePhone?: string;
  @IsOptional() @IsString() pan?: string;
  @IsOptional() @IsObject() address?: Record<string, unknown>;
  @IsOptional() @IsBoolean() portalAccess?: boolean;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() alternatePhone?: string;
  @IsOptional() @IsObject() address?: Record<string, unknown>;
  @IsOptional() @IsBoolean() portalAccess?: boolean;
}

export class FilterCustomerDto extends PaginationDto {}
