import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum LeaveTypeDto {
  ANNUAL = "ANNUAL", SICK = "SICK", CASUAL = "CASUAL",
  MATERNITY = "MATERNITY", PATERNITY = "PATERNITY", UNPAID = "UNPAID",
}

export enum ApprovalStatusDto {
  PENDING = "PENDING", APPROVED = "APPROVED", REJECTED = "REJECTED",
}

export class CreateLeaveDto {
  @IsString() @IsNotEmpty() employeeId!: string;
  @IsEnum(LeaveTypeDto) type!: LeaveTypeDto;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @Type(() => Number) @IsInt() @Min(1) days!: number;
  @IsOptional() @IsString() reason?: string;
}

export class UpdateLeaveDto {
  @IsOptional() @IsEnum(LeaveTypeDto) type?: LeaveTypeDto;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) days?: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsEnum(ApprovalStatusDto) status?: ApprovalStatusDto;
}

export class FilterLeaveDto extends PaginationDto {
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsEnum(ApprovalStatusDto) status?: ApprovalStatusDto;
}
