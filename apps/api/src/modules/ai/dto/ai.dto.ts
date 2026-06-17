import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class LeadScoreDto {
  @IsString() @IsNotEmpty() leadId!: string;
  @IsOptional() @IsString() context?: string;
}

export class SuggestFollowUpDto {
  @IsString() @IsNotEmpty() leadId!: string;
  @IsOptional() @IsString() lastInteraction?: string;
}

export interface AiLeadScoreResponse {
  leadId: string;
  score: number;
  confidence: number;
  factors: string[];
  recommendation: string;
  nextBestAction?: string;
  probabilityToClose?: number;
}

export interface AiFollowUpResponse {
  leadId: string;
  suggestedAction: string;
  suggestedMessage: string;
  bestTime: string;
  channel: string;
}
