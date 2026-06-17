import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum POStatusDto {
  DRAFT = "DRAFT", SENT = "SENT", APPROVED = "APPROVED", DELIVERED = "DELIVERED", CANCELLED = "CANCELLED",
}

export class CreatePurchaseOrderDto {
  @IsString() @IsNotEmpty() vendorId!: string;
  @IsString() @IsNotEmpty() projectId!: string;
  @IsOptional() @IsString() requisitionId?: string;
  @IsObject() items!: Record<string, unknown>;
  @Type(() => Number) @IsNumber() subtotal!: number;
  @Type(() => Number) @IsNumber() gstAmount!: number;
  @Type(() => Number) @IsNumber() totalAmount!: number;
  @IsOptional() @IsDateString() deliveryDate?: string;
  @IsOptional() @IsString() deliveryAddress?: string;
  @IsOptional() @IsString() terms?: string;
}

export class UpdatePurchaseOrderDto {
  @IsOptional() @IsObject() items?: Record<string, unknown>;
  @IsOptional() @Type(() => Number) @IsNumber() subtotal?: number;
  @IsOptional() @Type(() => Number) @IsNumber() gstAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() totalAmount?: number;
  @IsOptional() @IsDateString() deliveryDate?: string;
  @IsOptional() @IsEnum(POStatusDto) status?: POStatusDto;
}

export class FilterPurchaseOrderDto extends PaginationDto {
  @IsOptional() @IsString() vendorId?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsEnum(POStatusDto) status?: POStatusDto;
}
