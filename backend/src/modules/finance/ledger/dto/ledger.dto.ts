import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../../common/dto/pagination.dto";

export enum EntryTypeDto { DEBIT = "DEBIT", CREDIT = "CREDIT" }

export class CreateLedgerEntryDto {
  @IsOptional() @IsString() projectId?: string;
  @IsString() @IsNotEmpty() accountCode!: string;
  @IsString() @IsNotEmpty() accountName!: string;
  @IsEnum(EntryTypeDto) entryType!: EntryTypeDto;
  @Type(() => Number) @IsNumber() amount!: number;
  @IsString() @IsNotEmpty() description!: string;
  @IsOptional() @IsString() reference?: string;
  @IsDateString() entryDate!: string;
  @IsString() @IsNotEmpty() createdBy!: string;
}

export class UpdateLedgerEntryDto {
  @IsOptional() @IsString() accountName?: string;
  @IsOptional() @Type(() => Number) @IsNumber() amount?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsDateString() entryDate?: string;
}

export class FilterLedgerDto extends PaginationDto {
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsEnum(EntryTypeDto) entryType?: EntryTypeDto;
}
