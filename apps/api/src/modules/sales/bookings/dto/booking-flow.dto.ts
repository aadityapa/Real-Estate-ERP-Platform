import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class ReserveUnitDto {
  @IsString()
  @IsNotEmpty()
  leadId!: string;

  @IsString()
  @IsNotEmpty()
  unitId!: string;
}

export class ConfirmBookingDto {
  @IsString()
  @IsNotEmpty()
  leadId!: string;

  @IsString()
  @IsNotEmpty()
  unitId!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsString()
  @IsNotEmpty()
  salesPersonId!: string;

  @IsOptional()
  @IsString()
  paymentPlanId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  premiumAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discountAmount?: number;

  @Type(() => Number)
  @IsNumber()
  bookingAmount!: number;

  @IsDateString()
  bookingDate!: string;
}

export enum AgreementTypeDto {
  ALLOTMENT = "ALLOTMENT",
  SALE = "SALE",
  REGISTRATION = "REGISTRATION",
}

export class GenerateAgreementDto {
  @IsEnum(AgreementTypeDto)
  type!: AgreementTypeDto;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stampDuty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  registrationFee?: number;
}
