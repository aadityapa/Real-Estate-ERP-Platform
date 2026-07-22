import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum AttendanceStatusDto {
  PRESENT = "PRESENT",
  ABSENT = "ABSENT",
  HALF_DAY = "HALF_DAY",
  WFH = "WFH",
  HOLIDAY = "HOLIDAY",
}

export class CreateAttendanceDto {
  @IsString() @IsNotEmpty() employeeId!: string;
  @IsDateString() date!: string;
  @IsOptional() @IsDateString() checkIn?: string;
  @IsOptional() @IsDateString() checkOut?: string;
  @IsEnum(AttendanceStatusDto) status!: AttendanceStatusDto;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateAttendanceDto {
  @IsOptional() @IsDateString() checkIn?: string;
  @IsOptional() @IsDateString() checkOut?: string;
  @IsOptional() @IsEnum(AttendanceStatusDto) status?: AttendanceStatusDto;
  @IsOptional() @IsString() notes?: string;
}

export class FilterAttendanceDto extends PaginationDto {
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsEnum(AttendanceStatusDto) status?: AttendanceStatusDto;
}
