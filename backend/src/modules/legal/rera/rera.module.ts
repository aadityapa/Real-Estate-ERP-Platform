import { Module } from "@nestjs/common";
import { ReraController } from "./rera.controller";
import { ReraService } from "./rera.service";

@Module({
  controllers: [ReraController],
  providers: [ReraService],
  exports: [ReraService],
})
export class ReraModule {}
