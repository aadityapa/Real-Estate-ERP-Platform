import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { PrismaService } from "../../database/prisma.service";
import { EventsService } from "../events/events.service";
import {
  LeadScoreDto,
  SuggestFollowUpDto,
  AiLeadScoreResponse,
  AiFollowUpResponse,
} from "./dto/ai.dto";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventsService: EventsService,
  ) {
    const apiKey = this.configService.get<string>("OPENAI_API_KEY");
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    if (!apiKey) {
      this.logger.warn("OPENAI_API_KEY not set — AI will use fallback scoring");
    }
  }

  async scoreLead(tenantId: string, dto: LeadScoreDto): Promise<AiLeadScoreResponse> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: dto.leadId, tenantId },
      include: {
        followUps: { take: 5, orderBy: { scheduledAt: "desc" } },
        siteVisits: { take: 3 },
        project: { select: { name: true, type: true } },
      },
    });

    if (!lead) {
      return this.fallbackScore(dto.leadId);
    }

    if (!this.openai) {
      return this.fallbackScore(dto.leadId, lead);
    }

    try {
      const prompt = `You are a real estate sales AI for Indian property developers.
Analyze this lead and return JSON only (no markdown):
{
  "score": 0-100,
  "confidence": 0.0-1.0,
  "factors": ["reason1", "reason2"],
  "recommendation": "one sentence next action",
  "nextBestAction": "CALL|EMAIL|WHATSAPP|SITE_VISIT|FOLLOW_UP",
  "probabilityToClose": 0-100
}

Lead: ${lead.firstName} ${lead.lastName ?? ""}
Phone: ${lead.phone}
Source: ${lead.source}
Status: ${lead.status}
Priority: ${lead.priority}
Budget: ${JSON.stringify(lead.budget)}
Requirements: ${JSON.stringify(lead.requirements)}
Project: ${lead.project?.name ?? "Not assigned"}
Follow-ups: ${lead.followUps.length}
Site visits: ${lead.siteVisits.length}`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return this.fallbackScore(dto.leadId, lead);

      const parsed = JSON.parse(content) as AiLeadScoreResponse & {
        nextBestAction?: string;
        probabilityToClose?: number;
      };

      await this.prisma.lead.update({
        where: { id: dto.leadId },
        data: {
          aiScore: parsed.score,
          aiNotes: parsed.recommendation,
          aiNextAction: parsed.nextBestAction ?? parsed.recommendation,
          score: parsed.score,
        },
      });

      this.eventsService.emitLeadScored(tenantId, dto.leadId, parsed.score);

      return {
        leadId: dto.leadId,
        score: parsed.score,
        confidence: parsed.confidence ?? 0.8,
        factors: parsed.factors ?? [],
        recommendation: parsed.recommendation,
        nextBestAction: parsed.nextBestAction,
        probabilityToClose: parsed.probabilityToClose,
      };
    } catch (error) {
      this.logger.error("OpenAI scoring failed", error);
      return this.fallbackScore(dto.leadId, lead);
    }
  }

  async suggestFollowUp(
    tenantId: string,
    dto: SuggestFollowUpDto,
  ): Promise<AiFollowUpResponse> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: dto.leadId, tenantId },
      include: { followUps: { take: 5, orderBy: { createdAt: "desc" } } },
    });

    if (!lead || !this.openai) {
      return {
        leadId: dto.leadId,
        suggestedAction: "CALL",
        suggestedMessage:
          "Hi! Following up on your interest in our project. Would you like to schedule a site visit?",
        bestTime: "Tomorrow 10:00 AM",
        channel: "WHATSAPP",
      };
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `Suggest follow-up for real estate lead in India. Return JSON:
{"suggestedAction":"CALL|EMAIL|WHATSAPP","suggestedMessage":"...","bestTime":"...","channel":"..."}
Lead: ${lead.firstName}, status: ${lead.status}, source: ${lead.source}
Recent follow-ups: ${lead.followUps.map((f) => f.type).join(", ")}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response");

      const parsed = JSON.parse(content) as AiFollowUpResponse;
      return { ...parsed, leadId: dto.leadId };
    } catch {
      return {
        leadId: dto.leadId,
        suggestedAction: "WHATSAPP",
        suggestedMessage: `Hi ${lead.firstName}, thank you for your interest! Can we schedule a site visit?`,
        bestTime: "Tomorrow 11:00 AM",
        channel: "WHATSAPP",
      };
    }
  }

  private fallbackScore(
    leadId: string,
    lead?: {
      status: string;
      source: string;
      followUps: unknown[];
      siteVisits: unknown[];
    },
  ): AiLeadScoreResponse {
    let score = 50;
    const factors: string[] = [];

    if (lead) {
      if (lead.status === "SITE_VISIT") {
        score += 20;
        factors.push("Site visit scheduled");
      }
      if (lead.status === "NEGOTIATION") {
        score += 30;
        factors.push("In negotiation");
      }
      if (["REFERRAL", "WALKIN"].includes(lead.source)) {
        score += 10;
        factors.push("High-intent source");
      }
      if (lead.followUps.length > 0) factors.push("Active follow-up history");
    }

    score = Math.min(100, score);

    return {
      leadId,
      score,
      confidence: 0.6,
      factors: factors.length ? factors : ["Limited data — manual review recommended"],
      recommendation: score >= 70 ? "Priority follow-up within 24h" : "Standard nurture sequence",
      nextBestAction: "CALL",
      probabilityToClose: Math.round(score * 0.6),
    };
  }
}
