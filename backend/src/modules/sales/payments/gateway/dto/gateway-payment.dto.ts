import { Type } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from "class-validator";

export class CreateGatewayOrderDto {
  @IsString()
  @IsNotEmpty()
  paymentId!: string;

  /** Optional partial charge in integer paise. Defaults to remaining installment balance. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPaise?: number;
}

export class ConfirmGatewayPaymentDto {
  @IsString()
  @IsNotEmpty()
  razorpayOrderId!: string;

  @IsString()
  @IsNotEmpty()
  razorpayPaymentId!: string;

  @IsString()
  @IsNotEmpty()
  razorpaySignature!: string;
}

export class RefundGatewayPaymentDto {
  /** Optional partial refund in integer paise. Defaults to full captured amount minus prior refunds. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPaise?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class ReconciliationQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
