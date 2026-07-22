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
  findAll(@TenantId() tenantId: string, @Query() filter: FilterCompanyDto) {
    return this.companiesService.findAll(tenantId, filter);
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.companiesService.findOne(tenantId, id);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateCompanyDto) {
    return this.companiesService.create(tenantId, dto);
  }

  @Patch(":id")
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(tenantId, id, dto);
  }

  @Delete(":id")
  archive(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.companiesService.archive(tenantId, id);
  }
}
