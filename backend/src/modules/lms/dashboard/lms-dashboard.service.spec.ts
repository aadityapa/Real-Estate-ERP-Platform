import { LmsDashboardService } from "./lms-dashboard.service";

type MockFn = jest.Mock;

describe("LmsDashboardService — query shape (Phase 7.1)", () => {
  let service: LmsDashboardService;
  let prisma: {
    lead: { count: MockFn; groupBy: MockFn };
    siteVisit: { count: MockFn; groupBy: MockFn };
    booking: { count: MockFn; groupBy: MockFn };
    unit: { count: MockFn };
    project: { count: MockFn };
    user: { findMany: MockFn };
    clashLead: { findMany: MockFn; findFirst: MockFn; update: MockFn };
  };

  beforeEach(() => {
    prisma = {
      lead: {
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      siteVisit: {
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      booking: {
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      unit: { count: jest.fn().mockResolvedValue(0) },
      project: { count: jest.fn().mockResolvedValue(0) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      clashLead: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new LmsDashboardService(prisma as never);
  });

  it("getLeaderboard uses fixed groupBy queries (not per-user N+1)", async () => {
    prisma.lead.groupBy.mockResolvedValue([
      { assignedToId: "u1", _count: { id: 10 } },
      { assignedToId: "u2", _count: { id: 5 } },
    ]);
    prisma.siteVisit.groupBy.mockResolvedValue([
      { attendedBy: "u1", _count: { id: 3 } },
    ]);
    prisma.booking.groupBy.mockResolvedValue([
      { salesPersonId: "u1", _count: { id: 2 } },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: "u1", firstName: "A", lastName: "One", avatar: null },
      { id: "u2", firstName: "B", lastName: "Two", avatar: null },
    ]);

    const rows = await service.getLeaderboard("tenant-a", 7, 2026);

    expect(prisma.lead.groupBy).toHaveBeenCalledTimes(1);
    expect(prisma.siteVisit.groupBy).toHaveBeenCalledTimes(1);
    expect(prisma.booking.groupBy).toHaveBeenCalledTimes(1);
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.lead.count).not.toHaveBeenCalled();
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-a",
          id: { in: expect.arrayContaining(["u1", "u2"]) },
        }),
      }),
    );
    expect(rows[0]).toMatchObject({
      userId: "u1",
      totalLeads: 10,
      bookings: 2,
      rank: 1,
    });
  });

  it("getFunnel uses one groupBy instead of per-stage counts", async () => {
    prisma.lead.groupBy.mockResolvedValue([
      { status: "NEW", _count: { id: 4 } },
      { status: "BOOKING", _count: { id: 1 } },
    ]);

    const funnel = await service.getFunnel("tenant-a");

    expect(prisma.lead.groupBy).toHaveBeenCalledTimes(1);
    expect(prisma.lead.count).not.toHaveBeenCalled();
    expect(funnel.find((s) => s.stage === "NEW")?.count).toBe(4);
    expect(funnel.find((s) => s.stage === "CONTACTED")?.count).toBe(0);
  });
});
