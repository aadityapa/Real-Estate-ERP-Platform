import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export enum PaymentModeDto {
  CASH = "CASH",
  CHEQUE = "CHEQUE",
  NEFT = "NEFT",
  RTGS = "RTGS",
  UPI = "UPI",
  DD = "DD",
}

export class RecordPaymentDto {
  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsEnum(PaymentModeDto)
  paymentMode!: PaymentModeDto;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsDateString()
  paidDate?: string;
}
