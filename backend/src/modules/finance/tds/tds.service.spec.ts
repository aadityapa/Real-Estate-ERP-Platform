import { TdsService } from "./tds.service";
import type { PrismaService } from "../../../database/prisma.service";

type MockFn = jest.Mock;

describe("TdsService", () => {
  let service: TdsService;
  let prisma: {
    vendor: { findFirst: MockFn };
    customer: { findFirst: MockFn };
    gSTInvoice: { findFirst: MockFn };
    tdsEntry: {
      findFirst: MockFn;
      findMany: MockFn;
      count: MockFn;
      create: MockFn;
      update: MockFn;
    };
  };
  const tenantId = "tenant-tds";

  beforeEach(() => {
    prisma = {
      vendor: { findFirst: jest.fn() },
      customer: { findFirst: jest.fn() },
      gSTInvoice: { findFirst: jest.fn() },
      tdsEntry: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }: { data: object }) =>
          Promise.resolve({
            id: "tds-1",
            tenantId,
            vendorId: null,
            customerId: null,
            vendorPaymentId: null,
            paymentId: null,
            gstInvoiceId: null,
            challanNumber: null,
            challanDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          }),
        ),
        update: jest.fn(),
      },
    };
    service = new TdsService(prisma as unknown as PrismaService);
  });

  it("creates 194IA TDS entry with paise amounts and FY quarter", async () => {
    const row = await service.create(tenantId, {
      section: "194IA",
      deducteeType: "CUSTOMER",
      deducteeName: "Buyer",
      deducteePanLast4: "1234",
      paymentAmountPaise: 50_00_000_00,
      tdsRateBps: 100,
      deductDate: "2025-08-10",
    });

    expect(row.section).toBe("194IA");
    expect(row.tdsAmountPaise).toBe("5000000");
    expect(row.netPayablePaise).toBe("495000000");
    expect(row.fiscalYear).toBe("2025-26");
    expect(row.quarter).toBe("Q2");
    expect(row.status).toBe("ACCRUED");
  });

  it("exports quarterly TDS return aggregates by section", async () => {
    prisma.tdsEntry.findMany.mockResolvedValue([
      {
        id: "1",
        tenantId,
        section: "194C",
        deducteeType: "VENDOR",
        deducteeName: "Contractor",
        deducteePanLast4: "AB12",
        vendorId: null,
        customerId: null,
        vendorPaymentId: null,
        paymentId: null,
        gstInvoiceId: null,
        paymentAmountPaise: 1_00_000_00n,
        tdsRateBps: 200,
        tdsAmountPaise: 2_00_000n,
        netPayablePaise: 98_00_000n,
        deductDate: new Date("2025-05-01"),
        challanNumber: null,
        challanDate: null,
        quarter: "Q1",
        fiscalYear: "2025-26",
        status: "ACCRUED",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const exp = await service.exportReturn(tenantId, {
      fiscalYear: "2025-26",
      quarter: "Q1",
    });
    expect(exp.count).toBe(1);
    expect(exp.tdsAmountPaise).toBe("200000");
    expect(exp.bySection[0]?.section).toBe("194C");
  });
});
