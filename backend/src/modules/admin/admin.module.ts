import { Module } from "@nestjs/common";
import { CompaniesModule } from "./companies/companies.module";
import { ProjectsModule } from "./projects/projects.module";
import { UsersModule } from "./users/users.module";
import { TabLoginsModule } from "./tab-logins/tab-logins.module";

@Module({
  imports: [CompaniesModule, ProjectsModule, UsersModule, TabLoginsModule],
})
export class AdminModule {}
