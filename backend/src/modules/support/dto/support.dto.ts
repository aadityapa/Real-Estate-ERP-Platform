import { IsArray, IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class CreateSupportTicketDto {
  @IsString()
  @MinLength(3)
  subject!: string;

  @IsString()
  @MinLength(3)
  description!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  screenshots?: string[];
}

export class ReplySupportTicketDto {
  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

export class UpdateSupportTicketStatusDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  resolution?: string;
}
