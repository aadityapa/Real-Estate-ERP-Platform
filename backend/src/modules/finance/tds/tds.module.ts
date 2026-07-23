import { Module } from "@nestjs/common";
import { TdsController } from "./tds.controller";
import { TdsService } from "./tds.service";

@Module({
  controllers: [TdsController],
  providers: [TdsService],
  exports: [TdsService],
})
export class TdsModule {}
