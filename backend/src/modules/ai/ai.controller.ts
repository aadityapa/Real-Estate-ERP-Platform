import { Body, Controller, Post } from "@nestjs/common";
import { TenantId } from "../../common/decorators/current-user.decorator";
import { AiService } from "./ai.service";
import { LeadScoreDto, SuggestFollowUpDto } from "./dto/ai.dto";

@Controller("ai")
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post("lead-score")
  scoreLead(@TenantId() tenantId: string, @Body() dto: LeadScoreDto) {
    return this.service.scoreLead(tenantId, dto);
  }

  @Post("suggest-follow-up")
  suggestFollowUp(@TenantId() tenantId: string, @Body() dto: SuggestFollowUpDto) {
    return this.service.suggestFollowUp(tenantId, dto);
  }}
