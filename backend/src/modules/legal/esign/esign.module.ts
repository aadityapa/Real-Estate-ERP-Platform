import { Module } from "@nestjs/common";
import { ESignController } from "./esign.controller";
import { ESignService } from "./esign.service";
import { ESIGN_PROVIDER } from "./provider/esign.interface";
import { MockESignAdapter } from "./provider/mock-esign.adapter";
import { DigioStubAdapter } from "./provider/digio.stub";

function resolveESignProvider(): typeof MockESignAdapter | typeof DigioStubAdapter {
  const key = (process.env["ESIGN_PROVIDER"] ?? "mock").toLowerCase();
  if (key === "digio") {
    const hasKeys =
      Boolean(process.env["DIGIO_CLIENT_ID"]) &&
      Boolean(process.env["DIGIO_CLIENT_SECRET"]);
    if (!hasKeys) {
      return MockESignAdapter;
    }
    return DigioStubAdapter;
  }
  return MockESignAdapter;
}

@Module({
  controllers: [ESignController],
  providers: [
    ESignService,
    MockESignAdapter,
    DigioStubAdapter,
    { provide: ESIGN_PROVIDER, useClass: resolveESignProvider() },
  ],
  exports: [ESignService],
})
export class ESignModule {}
