import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";
export enum UserStatusDto { ACTIVE = "ACTIVE", INACTIVE = "INACTIVE", ARCHIVED = "ARCHIVED" }
export class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @IsNotEmpty() firstName!: string;
  @IsString() @IsNotEmpty() lastName!: string;
  @IsOptional() @IsString() phone?: string;
}
export class FilterUserDto extends PaginationDto {
  @IsOptional() @IsEnum(UserStatusDto) status?: UserStatusDto;
}
