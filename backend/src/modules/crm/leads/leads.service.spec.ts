import { NotFoundException } from "@nestjs/common";
import { LeadsService } from "./leads.service";
import {
  createTestTenant,
  createTestUser,
  resetFactoryIds,
} from "../../../../test/helpers/factories";

type MockFn = jest.Mock;

describe("LeadsService — tenant scoping", () => {
  let service: LeadsService;
  let prisma: {
    lead: {
      findMany: MockFn;
      count: MockFn;
      findFirst: MockFn;
      create: MockFn;
      update: MockFn;
      groupBy: MockFn;
    };
    activity: { create: MockFn };
    followUp: { count: MockFn };
    siteVisit: { count: MockFn };
  };
  let eventsService: {
    emitLeadCreated: MockFn;
    emitNewLeadToFeed: MockFn;
  };

  const tenantA = createTestTenant({ id: "tenant-a", slug: "a" });
  const tenantB = createTestTenant({ id: "tenant-b", slug: "b" });
  const userA = createTestUser(tenantA.id, "Sales Rep", { id: "user-a" });

  beforeEach(() => {
    resetFactoryIds();
    prisma = {
      lead: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      activity: { create: jest.fn().mockResolvedValue({}) },
      followUp: { count: jest.fn().mockResolvedValue(0) },
      siteVisit: { count: jest.fn().mockResolvedValue(0) },
    };
    eventsService = {
      emitLeadCreated: jest.fn(),
      emitNewLeadToFeed: jest.fn(),
    };
    service = new LeadsService(prisma as never, eventsService as never);
  });

  it("findAll always filters by tenantId", async () => {
    await service.findAll(tenantA.id, { page: 1, limit: 20 });
    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: tenantA.id }),
      }),
    );
    expect(prisma.lead.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ tenantId: tenantA.id }),
    });
  });

  it("findOne scopes by tenant and throws when missing", async () => {
    prisma.lead.findFirst.mockResolvedValue(null);
    await expect(service.findOne(tenantA.id, "lead-x")).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead-x", tenantId: tenantA.id },
      }),
    );
  });

  it("create stamps tenantId and emits events", async () => {
    const created = {
      id: "lead-1",
      tenantId: tenantA.id,
      firstName: "Riya",
      lastName: "Shah",
      phone: "9999999999",
      source: "WEBSITE",
    };
    prisma.lead.create.mockResolvedValue(created);

    await service.create(tenantA.id, userA.id, {
      firstName: "Riya",
      phone: "9999999999",
      source: "WEBSITE",
    } as never);

    expect(prisma.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: tenantA.id }),
      }),
    );
    expect(eventsService.emitLeadCreated).toHaveBeenCalledWith(
      tenantA.id,
      expect.objectContaining({ id: "lead-1" }),
    );
  });

  it("archive requires a tenant-scoped find first", async () => {
    prisma.lead.findFirst.mockResolvedValue({
      id: "lead-1",
      tenantId: tenantA.id,
    });
    prisma.lead.update.mockResolvedValue({
      id: "lead-1",
      isArchived: true,
    });

    await service.archive(tenantA.id, "lead-1");

    expect(prisma.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead-1", tenantId: tenantA.id },
      }),
    );
    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: { isArchived: true },
      include: expect.any(Object),
    });
  });

  it("does not return another tenant's lead via findOne", async () => {
    // Simulate DB returning null when tenantB tries to read tenantA's lead id
    prisma.lead.findFirst.mockResolvedValue(null);
    await expect(service.findOne(tenantB.id, "lead-owned-by-a")).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead-owned-by-a", tenantId: tenantB.id },
      }),
    );
  });

  it("assign re-checks tenant before update", async () => {
    prisma.lead.findFirst.mockResolvedValue({
      id: "lead-1",
      tenantId: tenantA.id,
    });
    prisma.lead.update.mockResolvedValue({
      id: "lead-1",
      assignedToId: "user-2",
    });

    await service.assign(tenantA.id, userA.id, "lead-1", {
      assignedToId: "user-2",
    });

    expect(prisma.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead-1", tenantId: tenantA.id },
      }),
    );
  });
});
