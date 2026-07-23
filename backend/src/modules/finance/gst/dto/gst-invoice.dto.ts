import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum InvoiceTypeDto {
  SALES = "SALES",
  PURCHASE = "PURCHASE",
}

export enum InvoiceStatusDto {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

export class GstLineItemDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,8}$/)
  hsnSac!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  /** Unit price in paise (integer). */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPricePaise!: number;

  /** Taxable line amount in paise (integer). */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  taxablePaise!: number;

  /** GST rate in basis points (1800 = 18%). */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(4000)
  gstRateBps!: number;
}

export class CreateGstInvoiceDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsEnum(InvoiceTypeDto)
  type!: InvoiceTypeDto;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i)
  supplierGstin!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,2}$/)
  supplierStateCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i)
  buyerGstin?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{1,2}$/)
  buyerStateCode!: string;

  @IsOptional()
  @IsString()
  buyerName?: string;

  /** Place of supply state code (defaults to buyerStateCode). */
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,2}$/)
  placeOfSupply?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  saasInvoiceId?: string;

  @IsOptional()
  @IsString()
  receiptId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GstLineItemDto)
  items!: GstLineItemDto[];

  @IsDateString()
  invoiceDate!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  seriesPrefix?: string;

  /** Request IRN generation after create (mock IRP by default). */
  @IsOptional()
  @IsBoolean()
  requestEInvoice?: boolean;
}

export class FilterGstInvoiceDto extends PaginationDto {
  @IsOptional()
  @IsEnum(InvoiceStatusDto)
  status?: InvoiceStatusDto;

  @IsOptional()
  @IsEnum(InvoiceTypeDto)
  type?: InvoiceTypeDto;

  @IsOptional()
  @IsString()
  fiscalYear?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class GstrExportQueryDto {
  @IsString()
  @IsNotEmpty()
  fiscalYear!: string;

  @IsOptional()
  @IsString()
  @Matches(/^Q[1-4]$/)
  quarter?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class CancelEInvoiceDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
