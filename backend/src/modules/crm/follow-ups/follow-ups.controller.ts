import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { FollowUpsService } from "./follow-ups.service";
import {
  CreateFollowUpDto,
  FilterFollowUpDto,
  UpdateFollowUpDto,
} from "./dto/follow-up.dto";
import { CurrentUser, TenantId } from "../../../common/decorators/current-user.decorator";
import type { JwtPayload } from "@propos/shared-types";

@Controller("crm/follow-ups")
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query() filter: FilterFollowUpDto,
  ) {
    return this.followUpsService.findAll(tenantId, filter);
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFollowUpDto,
  ) {
    return this.followUpsService.create(tenantId, user.userId, dto);
  }

  @Patch(":id")
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateFollowUpDto,
  ) {
    return this.followUpsService.update(tenantId, id, dto);
  }
}
