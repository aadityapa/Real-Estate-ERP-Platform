import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { LegalService } from "./legal.service";
import { CreateLegalCaseDto, FilterLegalCaseDto, UpdateLegalCaseDto } from "./dto/legal-case.dto";

@Controller("legal")
export class LegalController {
  constructor(private readonly service: LegalService) {}

  @Get() findAll(@TenantId() tenantId: string, @Query() filter: FilterLegalCaseDto) { return this.service.findAll(tenantId, filter); }
  @Get(":id") findOne(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.findOne(tenantId, id); }
  @Post() create(@TenantId() tenantId: string, @Body() dto: CreateLegalCaseDto) { return this.service.create(tenantId, dto); }
  @Patch(":id") update(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdateLegalCaseDto) { return this.service.update(tenantId, id, dto); }
  @Delete(":id") archive(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.archive(tenantId, id); }
}
