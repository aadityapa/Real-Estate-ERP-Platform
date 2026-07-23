import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class UpsertReraProfileDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  reraNumber!: string;

  @IsOptional()
  @IsDateString()
  registrationDate?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  promoterName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCarpetAreaSqm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  openParkingCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  coveredParkingCount?: number;

  @IsOptional()
  @IsObject()
  disclosures?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  projectWebsiteUrl?: string;

  @IsOptional()
  @IsDateString()
  lastDisclosureAt?: string;
}

export class ReraPaymentStageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsInt()
  @Min(0)
  @Max(10000)
  maxCumulativePctBps!: number;

  @IsInt()
  @Min(0)
  sortOrder!: number;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  linkedMilestoneName?: string;
}

export class ReplaceReraPaymentStagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReraPaymentStageDto)
  stages!: ReraPaymentStageDto[];
}

export class PatchReraPaymentStageDto {
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  maxCumulativePctBps?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  linkedMilestoneName?: string;
}

export class CheckReraPaymentDto {
  @IsString()
  bookingId!: string;

  /** Proposed collection in integer paise. */
  @IsString()
  @MinLength(1)
  proposedPaymentPaise!: string;
}
