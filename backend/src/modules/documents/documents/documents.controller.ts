import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import { DocumentsService } from "./documents.service";
import { CreateDocumentDto, FilterDocumentDto, UpdateDocumentDto } from "./dto/document.dto";

/** Stricter than global 100/min — document metadata / future upload traffic. */
@Throttle({ short: { limit: 30, ttl: 60000 } })
@Controller("documents")
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  @RequirePermissions(Permissions.DOCUMENTS_READ)
  findAll(@TenantId() tenantId: string, @Query() filter: FilterDocumentDto) {
    return this.service.findAll(tenantId, filter);
  }

  @Get(":id")
  @RequirePermissions(Permissions.DOCUMENTS_READ)
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions(Permissions.DOCUMENTS_WRITE)
  create(@TenantId() tenantId: string, @Body() dto: CreateDocumentDto) {
    return this.service.create(tenantId, dto);
  }

  @Patch(":id")
  @RequirePermissions(Permissions.DOCUMENTS_WRITE)
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(Permissions.DOCUMENTS_WRITE)
  remove(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.remove(tenantId, id);
  }
}
