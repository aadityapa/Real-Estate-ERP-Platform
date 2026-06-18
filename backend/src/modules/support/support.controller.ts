import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { SupportService } from "./support.service";
import { TenantId, CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "@propos/shared-types";

@Controller("support/tickets")
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @Get()
  findMine(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.service.findMyTickets(
      tenantId,
      user.userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get("admin")
  findAllAdmin(
    @TenantId() tenantId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.service.findAllAdmin(
      tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      subject: string;
      description: string;
      category?: string;
      priority?: string;
      module?: string;
      screenshots?: string[];
    },
  ) {
    return this.service.create(tenantId, user.userId, body);
  }

  @Post(":id/reply")
  reply(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { message: string; attachments?: string[]; isInternal?: boolean },
  ) {
    return this.service.reply(
      tenantId,
      id,
      user.userId,
      body.message,
      body.attachments,
      body.isInternal,
    );
  }

  @Patch(":id/status")
  updateStatus(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() body: { status: string; resolution?: string },
  ) {
    return this.service.updateStatus(tenantId, id, body.status, body.resolution);
  }
}
