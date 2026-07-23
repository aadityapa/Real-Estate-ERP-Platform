import { IsInt, IsOptional, Min, ValidateIf } from "class-validator";
import { Type } from "class-transformer";

/** Partial overrides — omit to leave unchanged; null clears override (plan default). */
export class UpdateTenantLimitsDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  apiRateLimitRpm?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxSeats?: number | null;

  /** -1 = unlimited. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(-1)
  maxProjects?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxStorageBytes?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  queueConcurrency?: number | null;
}
