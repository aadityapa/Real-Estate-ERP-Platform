import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum TdsStatusDto {
  ACCRUED = "ACCRUED",
  DEPOSITED = "DEPOSITED",
  REPORTED = "REPORTED",
}

export class CreateTdsEntryDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^194[A-Z0-9]+$/i)
  section!: string;

  @IsString()
  @IsNotEmpty()
  deducteeType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  deducteeName!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{4}$/i)
  deducteePanLast4?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  vendorPaymentId?: string;

  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsOptional()
  @IsString()
  gstInvoiceId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentAmountPaise!: number;

  /** Rate in basis points (100 = 1%). */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5000)
  tdsRateBps!: number;

  @IsDateString()
  deductDate!: string;

  @IsOptional()
  @IsString()
  challanNumber?: string;

  @IsOptional()
  @IsDateString()
  challanDate?: string;
}

export class UpdateTdsEntryDto {
  @IsOptional()
  @IsEnum(TdsStatusDto)
  status?: TdsStatusDto;

  @IsOptional()
  @IsString()
  challanNumber?: string;

  @IsOptional()
  @IsDateString()
  challanDate?: string;
}

export class FilterTdsEntryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsString()
  fiscalYear?: string;

  @IsOptional()
  @IsString()
  @Matches(/^Q[1-4]$/)
  quarter?: string;

  @IsOptional()
  @IsEnum(TdsStatusDto)
  status?: TdsStatusDto;
}

export class TdsReturnQueryDto {
  @IsString()
  @IsNotEmpty()
  fiscalYear!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^Q[1-4]$/)
  quarter!: string;
}
