import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PrivacyService } from "./privacy.service";

describe("PrivacyService", () => {
  const customer = {
    id: "c1",
    tenantId: "t1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "9999999999",
    erasedAt: null as Date | null,
  };

  const purpose = {
    id: "p1",
    code: "MARKETING",
    name: "Marketing",
    isActive: true,
  };

  function build() {
    const customerConsent = {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({
        granted: true,
        grantedAt: new Date("2026-07-01"),
        revokedAt: null,
        channel: "web",
        noticeVersion: "v1",
        purpose: { code: "MARKETING", name: "Marketing" },
      }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const customerApi = {
      findFirst: jest.fn().mockResolvedValue(customer),
      update: jest.fn().mockImplementation(({ data }: { data: object }) =>
        Promise.resolve({ ...customer, ...data }),
      ),
    };
    const dataSubjectRequest = {
      create: jest.fn().mockResolvedValue({ id: "dsr1" }),
    };
    const prisma = {
      consentPurpose: {
        findMany: jest.fn().mockResolvedValue([purpose]),
        findUnique: jest.fn().mockResolvedValue(purpose),
      },
      customer: customerApi,
      customerConsent,
      booking: { findMany: jest.fn().mockResolvedValue([]) },
      complaint: { findMany: jest.fn().mockResolvedValue([]) },
      supportTicket: { findMany: jest.fn().mockResolvedValue([]) },
      dataSubjectRequest,
      $transaction: jest.fn(
        async (
          fn: (tx: {
            customerConsent: typeof customerConsent;
            customer: typeof customerApi;
            dataSubjectRequest: typeof dataSubjectRequest;
          }) => Promise<unknown>,
        ): Promise<unknown> =>
          fn({
            customerConsent,
            customer: customerApi,
            dataSubjectRequest,
          }),
      ),
    };
    return { service: new PrivacyService(prisma as never), prisma };
  }

  it("records consent with purpose code", async () => {
    const { service, prisma } = build();
    const result = await service.recordConsent(
      "t1",
      "c1",
      { purposeCode: "MARKETING", granted: true, channel: "web" },
      "u1",
    );
    expect(result.granted).toBe(true);
    expect(result.purposeCode).toBe("MARKETING");
    expect(prisma.customerConsent.upsert).toHaveBeenCalled();
  });

  it("rejects unknown purpose", async () => {
    const { service, prisma } = build();
    prisma.consentPurpose.findUnique.mockResolvedValue(null);
    await expect(
      service.recordConsent("t1", "c1", {
        purposeCode: "NOPE",
        granted: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("exports customer package and logs DSR", async () => {
    const { service, prisma } = build();
    const pack = await service.exportCustomer("t1", "c1", "u1");
    expect(pack.subject).toBe("customer");
    expect(pack.customer["id"]).toBe("c1");
    expect(prisma.dataSubjectRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "ACCESS", status: "COMPLETED" }),
      }),
    );
  });

  it("404 when customer missing for export", async () => {
    const { service, prisma } = build();
    prisma.customer.findFirst.mockResolvedValue(null);
    await expect(service.exportCustomer("t1", "missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("corrects customer fields", async () => {
    const { service, prisma } = build();
    await service.correctCustomer(
      "t1",
      "c1",
      { firstName: "Augusta" },
      "u1",
    );
    expect(prisma.customer.update).toHaveBeenCalled();
    expect(prisma.dataSubjectRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "CORRECTION" }),
      }),
    );
  });

  it("rejects erasure when confirm id mismatches", async () => {
    const { service } = build();
    await expect(
      service.eraseCustomer("t1", "c1", { confirmCustomerId: "other" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("scrubs PII on erasure", async () => {
    const { service, prisma } = build();
    const result = await service.eraseCustomer(
      "t1",
      "c1",
      { confirmCustomerId: "c1" },
      "u1",
    );
    expect(result.alreadyErased).toBe(false);
    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: "Erased",
          phone: "erased-c1",
          pan: null,
          email: null,
        }),
      }),
    );
    expect(prisma.customerConsent.deleteMany).toHaveBeenCalled();
  });

  it("returns residency status", () => {
    const { service } = build();
    const status = service.residencyStatus();
    expect(status.residencyRegion).toBe("ap-south-1");
    expect(status.documentation).toContain("DPDP");
  });
});
