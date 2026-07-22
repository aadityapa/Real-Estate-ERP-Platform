import { Module } from "@nestjs/common";
import { MilestonesModule } from "./milestones/milestones.module";
import { DprModule } from "./dpr/dpr.module";

@Module({ imports: [MilestonesModule, DprModule] })
export class ConstructionModule {}
