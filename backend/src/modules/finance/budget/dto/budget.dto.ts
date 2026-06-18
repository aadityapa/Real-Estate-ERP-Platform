import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export class CreateBudgetDto {
  @IsString() @IsNotEmpty() projectId!: string;
  @Type(() => Number) @IsInt() year!: number;
  @IsOptional() @Type(() => Number) @IsInt() month?: number;
  @IsString() @IsNotEmpty() category!: string;
  @Type(() => Number) @IsNumber() planned!: number;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateBudgetDto {
  @IsOptional() @Type(() => Number) @IsNumber() planned?: number;
  @IsOptional() @Type(() => Number) @IsNumber() actual?: number;
  @IsOptional() @Type(() => Number) @IsNumber() variance?: number;
  @IsOptional() @IsString() notes?: string;
}

export class FilterBudgetDto extends PaginationDto {
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @Type(() => Number) @IsInt() year?: number;
}
