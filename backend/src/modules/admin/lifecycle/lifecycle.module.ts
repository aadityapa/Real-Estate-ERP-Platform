import { Module } from "@nestjs/common";
import { LifecycleController } from "./lifecycle.controller";
import { LifecycleService } from "./lifecycle.service";
import { StoragePurger } from "../../../common/lifecycle/storage-purger";

@Module({
  controllers: [LifecycleController],
  providers: [LifecycleService, StoragePurger],
  exports: [LifecycleService],
})
export class LifecycleModule {}
