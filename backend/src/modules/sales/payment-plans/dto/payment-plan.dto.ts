import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export class InstallmentDto {
  @IsString()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  percentage!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  daysFromBooking?: number;
}

export class CreatePaymentPlanDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstallmentDto)
  installments!: InstallmentDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class FilterPaymentPlanDto extends PaginationDto {
  @IsOptional()
  @IsString()
  projectId?: string;
}
