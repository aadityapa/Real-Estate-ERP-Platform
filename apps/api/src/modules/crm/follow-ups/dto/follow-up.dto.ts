import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum FollowUpTypeDto {
  CALL = "CALL",
  EMAIL = "EMAIL",
  WHATSAPP = "WHATSAPP",
  MEETING = "MEETING",
  VISIT = "VISIT",
}

export enum FollowUpStatusDto {
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  MISSED = "MISSED",
  RESCHEDULED = "RESCHEDULED",
}

export class CreateFollowUpDto {
  @IsString()
  @IsNotEmpty()
  leadId!: string;

  @IsEnum(FollowUpTypeDto)
  type!: FollowUpTypeDto;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFollowUpDto {
  @IsOptional()
  @IsEnum(FollowUpTypeDto)
  type?: FollowUpTypeDto;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsEnum(FollowUpStatusDto)
  status?: FollowUpStatusDto;

  @IsOptional()
  @IsDateString()
  completedAt?: string;
}

export class FilterFollowUpDto extends PaginationDto {
  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsEnum(FollowUpStatusDto)
  status?: FollowUpStatusDto;
}
