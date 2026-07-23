import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto, FilterProjectDto, UpdateProjectDto } from "./dto/project.dto";

@Controller("admin/projects")
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  @RequirePermissions(Permissions.ADMIN_PROJECTS_READ)
  findAll(@TenantId() tenantId: string, @Query() filter: FilterProjectDto) {
    return this.service.findAll(tenantId, filter);
  }

  @Get(":id")
  @RequirePermissions(Permissions.ADMIN_PROJECTS_READ)
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions(Permissions.ADMIN_PROJECTS_WRITE)
  create(@TenantId() tenantId: string, @Body() dto: CreateProjectDto) {
    return this.service.create(tenantId, dto);
  }

  @Patch(":id")
  @RequirePermissions(Permissions.ADMIN_PROJECTS_WRITE)
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(Permissions.ADMIN_PROJECTS_WRITE)
  remove(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.remove(tenantId, id);
  }
}
