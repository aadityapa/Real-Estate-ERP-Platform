import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import { CompaniesService } from "./companies.service";
import {
  CreateCompanyDto,
  FilterCompanyDto,
  UpdateCompanyDto,
} from "./dto/company.dto";

@Controller("admin/companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @RequirePermissions(Permissions.ADMIN_COMPANIES_READ)
  findAll(@TenantId() tenantId: string, @Query() filter: FilterCompanyDto) {
    return this.companiesService.findAll(tenantId, filter);
  }

  @Get(":id")
  @RequirePermissions(Permissions.ADMIN_COMPANIES_READ)
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.companiesService.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions(Permissions.ADMIN_COMPANIES_WRITE)
  create(@TenantId() tenantId: string, @Body() dto: CreateCompanyDto) {
    return this.companiesService.create(tenantId, dto);
  }

  @Patch(":id")
  @RequirePermissions(Permissions.ADMIN_COMPANIES_WRITE)
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(tenantId, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(Permissions.ADMIN_COMPANIES_WRITE)
  archive(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.companiesService.archive(tenantId, id);
  }
}
