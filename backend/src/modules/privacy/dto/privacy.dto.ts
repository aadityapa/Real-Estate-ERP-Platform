import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

const CONSENT_CHANNELS = [
  "web",
  "app",
  "paper",
  "phone",
  "in_person",
] as const;

export class RecordConsentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  purposeCode!: string;

  @IsBoolean()
  granted!: boolean;

  @IsOptional()
  @IsIn(CONSENT_CHANNELS)
  channel?: (typeof CONSENT_CHANNELS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  noticeVersion?: string;
}

export class CorrectCustomerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsString()
  aadhaar?: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;
}

export class EraseCustomerDto {
  /**
   * Must equal the customer id. Prevents accidental erasure.
   */
  @IsString()
  @IsNotEmpty()
  confirmCustomerId!: string;
}
