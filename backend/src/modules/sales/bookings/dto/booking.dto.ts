import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum BookingStatusDto {
  BOOKED = "BOOKED",
  AGREEMENT = "AGREEMENT",
  REGISTERED = "REGISTERED",
  POSSESSION = "POSSESSION",
  CANCELLED = "CANCELLED",
}

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  leadId!: string;

  @IsString()
  @IsNotEmpty()
  unitId!: string;

  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsString()
  @IsNotEmpty()
  salesPersonId!: string;

  @Type(() => Number)
  @IsNumber()
  unitPrice!: number;

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
  totalAmount!: number;

  @Type(() => Number)
  @IsNumber()
  bookingAmount!: number;

  @IsDateString()
  bookingDate!: string;

  @IsOptional()
  @IsString()
  paymentPlanId?: string;

  @IsOptional()
  @IsEnum(BookingStatusDto)
  status?: BookingStatusDto;
}

export class UpdateBookingDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  premiumAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bookingAmount?: number;

  @IsOptional()
  @IsDateString()
  bookingDate?: string;

  @IsOptional()
  @IsString()
  paymentPlanId?: string;

  @IsOptional()
  @IsEnum(BookingStatusDto)
  status?: BookingStatusDto;

  @IsOptional()
  @IsString()
  cancelReason?: string;
}

export class FilterBookingDto extends PaginationDto {
  @IsOptional()
  @IsEnum(BookingStatusDto)
  status?: BookingStatusDto;

  @IsOptional()
  @IsString()
  customerId?: string;
}
