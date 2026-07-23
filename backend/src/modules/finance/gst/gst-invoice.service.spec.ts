import { GstInvoiceService } from "./gst-invoice.service";
import { MockIrpAdapter } from "./irp/mock-irp.adapter";
import type { PrismaService } from "../../../database/prisma.service";
import { InvoiceTypeDto } from "./dto/gst-invoice.dto";

type MockFn = jest.Mock;

describe("GstInvoiceService", () => {
  let service: GstInvoiceService;
  let prisma: {
    company: { findFirst: MockFn };
    saasInvoice: { findFirst: MockFn };
    customer: { findFirst: MockFn };
    vendor: { findFirst: MockFn };
    gSTInvoice: {
      findFirst: MockFn;
      findMany: MockFn;
      count: MockFn;
      create: MockFn;
      update: MockFn;
    };
  };
  const tenantId = "tenant-gst";

  beforeEach(() => {
    prisma = {
      company: { findFirst: jest.fn() },
      saasInvoice: { findFirst: jest.fn() },
      customer: { findFirst: jest.fn() },
      vendor: { findFirst: jest.fn() },
      gSTInvoice: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }: { data: object }) =>
          Promise.resolve({
            id: "gst-1",
            tenantId,
            companyId: null,
            customerId: null,
            vendorId: null,
            saasInvoiceId: null,
            receiptId: null,
            dueDate: null,
            irn: null,
            irnAckNo: null,
            irnAckDate: null,
            signedQr: null,
            eInvoiceProvider: null,
            eInvoiceError: null,
            currency: "INR",
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          }),
        ),
        update: jest.fn().mockImplementation(({ data }: { data: object }) =>
          Promise.resolve({
            id: "gst-1",
            tenantId,
            invoiceNumber: "INV/2526/000001",
            type: "SALES",
            status: "SENT",
            items: [],
            supplierGstin: "27AABCS1429B1Z5",
            supplierStateCode: "27",
            buyerGstin: "29AABCT1332L1ZV",
            buyerStateCode: "29",
            buyerName: "Buyer",
            placeOfSupply: "29",
            customerId: null,
            vendorId: null,
            companyId: null,
            saasInvoiceId: null,
            receiptId: null,
            taxablePaise: 10000n,
            cgstPaise: 0n,
            sgstPaise: 0n,
            igstPaise: 1800n,
            totalGstPaise: 1800n,
            totalPaise: 11800n,
            currency: "INR",
            invoiceDate: new Date(),
            dueDate: null,
            fiscalYear: "2025-26",
            seriesPrefix: "INV",
            eInvoiceStatus: "GENERATED",
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          }),
        ),
      },
    };

    service = new GstInvoiceService(
      prisma as unknown as PrismaService,
      new MockIrpAdapter(),
    );
  });

  it("creates inter-state sales invoice with IGST and serial number", async () => {
    const inv = await service.create(tenantId, {
      type: InvoiceTypeDto.SALES,
      supplierGstin: "27AABCS1429B1Z5",
      buyerGstin: "29AABCT1332L1ZV",
      buyerStateCode: "29",
      buyerName: "Buyer Co",
      items: [
        {
          description: "Construction consulting",
          hsnSac: "998314",
          quantity: 1,
          unitPricePaise: 10000,
          taxablePaise: 10000,
          gstRateBps: 1800,
        },
      ],
      invoiceDate: "2025-07-15",
    });

    expect(inv.invoiceNumber).toMatch(/^INV\/2526\/000001$/);
    expect(inv.igstPaise).toBe("1800");
    expect(inv.cgstPaise).toBe("0");
    expect(inv.sgstPaise).toBe("0");
    expect(inv.totalPaise).toBe("11800");
    expect(prisma.gSTInvoice.create).toHaveBeenCalled();
  });

  it("creates intra-state invoice with CGST+SGST", async () => {
    const inv = await service.create(tenantId, {
      type: InvoiceTypeDto.SALES,
      supplierGstin: "27AABCS1429B1Z5",
      buyerStateCode: "27",
      items: [
        {
          description: "Unit sale amenity",
          hsnSac: "9954",
          quantity: 1,
          unitPricePaise: 10000,
          taxablePaise: 10000,
          gstRateBps: 1800,
        },
      ],
      invoiceDate: "2025-07-15",
    });

    expect(inv.cgstPaise).toBe("900");
    expect(inv.sgstPaise).toBe("900");
    expect(inv.igstPaise).toBe("0");
  });

  it("generates IRN via mock IRP and stores signed QR", async () => {
    prisma.gSTInvoice.findFirst.mockResolvedValue({
      id: "gst-1",
      tenantId,
      invoiceNumber: "INV/2526/000001",
      type: "SALES",
      status: "DRAFT",
      items: [
        {
          description: "Svc",
          hsnSac: "998314",
          quantity: 1,
          unitPricePaise: "10000",
          taxablePaise: "10000",
          gstRateBps: 1800,
          cgstPaise: "0",
          sgstPaise: "0",
          igstPaise: "1800",
        },
      ],
      supplierGstin: "27AABCS1429B1Z5",
      supplierStateCode: "27",
      buyerGstin: "29AABCT1332L1ZV",
      buyerStateCode: "29",
      buyerName: "Buyer",
      placeOfSupply: "29",
      customerId: null,
      vendorId: null,
      companyId: null,
      saasInvoiceId: null,
      receiptId: null,
      taxablePaise: 10000n,
      cgstPaise: 0n,
      sgstPaise: 0n,
      igstPaise: 1800n,
      totalGstPaise: 1800n,
      totalPaise: 11800n,
      currency: "INR",
      invoiceDate: new Date("2025-07-15"),
      dueDate: null,
      fiscalYear: "2025-26",
      seriesPrefix: "INV",
      irn: null,
      irnAckNo: null,
      irnAckDate: null,
      signedQr: null,
      eInvoiceStatus: "PENDING",
      eInvoiceProvider: null,
      eInvoiceError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.generateEInvoice(tenantId, "gst-1");
    expect(result.irn).toMatch(/^[A-F0-9]{64}$/);
    expect(result.signedQr).toBeTruthy();
    expect(result.eInvoiceStatus).toBe("GENERATED");
    expect(result.eInvoiceProvider).toBe("MOCK");
  });

  it("exports GSTR-1 sales register with totals", async () => {
    prisma.gSTInvoice.findMany.mockResolvedValue([
      {
        invoiceNumber: "INV/2526/000001",
        invoiceDate: new Date("2025-07-15"),
        buyerGstin: "29AABCT1332L1ZV",
        placeOfSupply: "29",
        taxablePaise: 10000n,
        cgstPaise: 0n,
        sgstPaise: 0n,
        igstPaise: 1800n,
        totalPaise: 11800n,
        irn: "ABC",
        eInvoiceStatus: "GENERATED",
        saasInvoiceId: null,
        receiptId: null,
      },
    ]);

    const reg = await service.exportSalesRegister(tenantId, {
      fiscalYear: "2025-26",
      quarter: "Q2",
    });
    expect(reg.count).toBe(1);
    expect(reg.igstPaise).toBe("1800");
    expect(reg.rows[0]?.invoiceNumber).toBe("INV/2526/000001");
  });
});
