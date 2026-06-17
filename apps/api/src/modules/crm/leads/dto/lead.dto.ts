import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum LeadSourceDto {
  WEBSITE = "WEBSITE",
  FACEBOOK = "FACEBOOK",
  GOOGLE = "GOOGLE",
  WHATSAPP = "WHATSAPP",
  PORTAL = "PORTAL",
  WALKIN = "WALKIN",
  REFERRAL = "REFERRAL",
  OTHER = "OTHER",
}

export enum LeadStatusDto {
  NEW = "NEW",
  CONTACTED = "CONTACTED",
  INTERESTED = "INTERESTED",
  SITE_VISIT = "SITE_VISIT",
  NEGOTIATION = "NEGOTIATION",
  BOOKING = "BOOKING",
  AGREEMENT = "AGREEMENT",
  REGISTRATION = "REGISTRATION",
  POSSESSION = "POSSESSION",
  LOST = "LOST",
}

export enum PriorityDto {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @IsEnum(LeadSourceDto)
  source!: LeadSourceDto;

  @IsOptional()
  @IsEnum(LeadStatusDto)
  status?: LeadStatusDto;

  @IsOptional()
  @IsEnum(PriorityDto)
  priority?: PriorityDto;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsObject()
  budget?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  requirements?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  leadRat?: number;
}

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(LeadSourceDto)
  source?: LeadSourceDto;

  @IsOptional()
  @IsEnum(LeadStatusDto)
  status?: LeadStatusDto;

  @IsOptional()
  @IsEnum(PriorityDto)
  priority?: PriorityDto;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsObject()
  budget?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  requirements?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  leadRat?: number;
}

export class FilterLeadDto extends PaginationDto {
  @IsOptional()
  @IsEnum(LeadStatusDto)
  status?: LeadStatusDto;

  @IsOptional()
  @IsEnum(LeadSourceDto)
  source?: LeadSourceDto;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;
}

export class AssignLeadDto {
  @IsString()
  @IsNotEmpty()
  assignedToId!: string;
}
