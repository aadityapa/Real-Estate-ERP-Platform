import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { UsersService } from "./users.service";
import { CreateUserDto, FilterUserDto } from "./dto/user.dto";
@Controller("admin/users")
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @Get() findAll(@TenantId() t: string, @Query() f: FilterUserDto) { return this.service.findAll(t, f); }
  @Get(":id") findOne(@TenantId() t: string, @Param("id") id: string) { return this.service.findOne(t, id); }
  @Post() create(@TenantId() t: string, @Body() dto: CreateUserDto) { return this.service.create(t, dto); }
  @Delete(":id") archive(@TenantId() t: string, @Param("id") id: string) { return this.service.archive(t, id); }
}
