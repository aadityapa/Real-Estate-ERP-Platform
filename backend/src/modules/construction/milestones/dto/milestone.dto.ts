import { Type } from "class-transformer";
import { IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum MilestoneStatusDto {
  PENDING = "PENDING", IN_PROGRESS = "IN_PROGRESS", COMPLETED = "COMPLETED", DELAYED = "DELAYED",
}

export class CreateMilestoneDto {
  @IsString() @IsNotEmpty() projectId!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsDateString() plannedStart!: string;
  @IsDateString() plannedEnd!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) dependencies?: string[];
}

export class UpdateMilestoneDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() plannedStart?: string;
  @IsOptional() @IsDateString() plannedEnd?: string;
  @IsOptional() @IsDateString() actualStart?: string;
  @IsOptional() @IsDateString() actualEnd?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) completionPct?: number;
  @IsOptional() @IsEnum(MilestoneStatusDto) status?: MilestoneStatusDto;
}

export class FilterMilestoneDto extends PaginationDto {
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsEnum(MilestoneStatusDto) status?: MilestoneStatusDto;
}
