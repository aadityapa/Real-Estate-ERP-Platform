import { IsArray, IsOptional, IsString, MinLength } from "class-validator";

export class CreateTabLoginDto {
  @IsString()
  roleId!: string;

  @IsString()
  @MinLength(1)
  tabId!: string;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsArray()
  @IsString({ each: true })
  allowedTabs!: string[];

  @IsString()
  defaultTab!: string;

  @IsOptional()
  @IsString()
  theme?: string;
}

export class UpdateTabLoginDto {
  @IsOptional()
  @IsString()
  tabId?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedTabs?: string[];

  @IsOptional()
  @IsString()
  defaultTab?: string;

  @IsOptional()
  @IsString()
  theme?: string;
}
