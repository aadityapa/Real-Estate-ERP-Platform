import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum SiteVisitOutcomeDto {
  INTERESTED = "INTERESTED",
  NOT_INTERESTED = "NOT_INTERESTED",
  NEGOTIATING = "NEGOTIATING",
}

export enum VisitStatusDto {
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export class CreateSiteVisitDto {
  @IsString()
  @IsNotEmpty()
  leadId!: string;

  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  attendedBy?: string;
}

export class UpdateSiteVisitDto {
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsEnum(SiteVisitOutcomeDto)
  outcome?: SiteVisitOutcomeDto;

  @IsOptional()
  @IsEnum(VisitStatusDto)
  status?: VisitStatusDto;
}

export class FilterSiteVisitDto extends PaginationDto {
  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsEnum(VisitStatusDto)
  status?: VisitStatusDto;
}
