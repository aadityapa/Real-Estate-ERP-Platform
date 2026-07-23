import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export enum AgreementTypeDto {
  ALLOTMENT = "ALLOTMENT",
  SALE = "SALE",
  REGISTRATION = "REGISTRATION",
}

export class CreateAgreementTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsEnum(AgreementTypeDto)
  type!: AgreementTypeDto;

  @IsString()
  @MinLength(10)
  @MaxLength(100_000)
  bodyText!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAgreementTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEnum(AgreementTypeDto)
  type?: AgreementTypeDto;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(100_000)
  bodyText?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  version?: number;
}

export class GenerateFromTemplateDto {
  @IsString()
  bookingId!: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsEnum(AgreementTypeDto)
  type?: AgreementTypeDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stampDuty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  registrationFee?: number;
}

/** Substitute {{key}} placeholders; unknown keys left as-is. */
export function mergeTemplate(
  body: string,
  vars: Record<string, string>,
): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return vars[key] ?? "";
    }
    return match;
  });
}
