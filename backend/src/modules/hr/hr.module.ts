import { Module } from "@nestjs/common";
import { EmployeesModule } from "./employees/employees.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { LeavesModule } from "./leaves/leaves.module";

@Module({ imports: [EmployeesModule, AttendanceModule, LeavesModule] })
export class HrModule {}
