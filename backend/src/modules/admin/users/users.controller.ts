import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import { UsersService } from "./users.service";
import { CreateUserDto, FilterUserDto } from "./dto/user.dto";

@Controller("admin/users")
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @RequirePermissions(Permissions.ADMIN_USERS_READ)
  findAll(@TenantId() t: string, @Query() f: FilterUserDto) {
    return this.service.findAll(t, f);
  }

  @Get(":id")
  @RequirePermissions(Permissions.ADMIN_USERS_READ)
  findOne(@TenantId() t: string, @Param("id") id: string) {
    return this.service.findOne(t, id);
  }

  @Post()
  @RequirePermissions(Permissions.ADMIN_USERS_WRITE)
  create(@TenantId() t: string, @Body() dto: CreateUserDto) {
    return this.service.create(t, dto);
  }

  @Delete(":id")
  @RequirePermissions(Permissions.ADMIN_USERS_WRITE)
  archive(@TenantId() t: string, @Param("id") id: string) {
    return this.service.archive(t, id);
  }
}
