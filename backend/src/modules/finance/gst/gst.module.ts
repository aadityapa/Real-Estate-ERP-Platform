import { Module } from "@nestjs/common";
import { GstInvoiceController } from "./gst-invoice.controller";
import { GstInvoiceService } from "./gst-invoice.service";
import { GST_IRP_PROVIDER } from "./irp/irp.interface";
import { MockIrpAdapter } from "./irp/mock-irp.adapter";
import { LicensedGspStubAdapter } from "./irp/licensed-gsp.stub";

const irpProvider =
  (process.env["GST_IRP_PROVIDER"] ?? "mock").toLowerCase() === "gsp"
    ? LicensedGspStubAdapter
    : MockIrpAdapter;

@Module({
  controllers: [GstInvoiceController],
  providers: [
    GstInvoiceService,
    MockIrpAdapter,
    LicensedGspStubAdapter,
    { provide: GST_IRP_PROVIDER, useClass: irpProvider },
  ],
  exports: [GstInvoiceService],
})
export class GstModule {}
