import { IsOptional, IsString, MinLength } from "class-validator";

export class DismissLeadDto {
  @IsString()
  @MinLength(1)
  reason!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLeadLabelDto {
  @IsString()
  @MinLength(1)
  leadLabel!: string;

  @IsOptional()
  @IsString()
  leadCallStatus?: string;
}
