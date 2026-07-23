import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class HardDeleteTenantDto {
  /**
   * Must equal the tenant's slug (not id). Prevents accidental erasure.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(64)
  confirmSlug!: string;
}
