import { ConflictException } from "@nestjs/common";
import { LmsDataFeedService } from "./lms-data-feed.service";

describe("LmsDataFeedService — claim lock", () => {
  let prisma: {
    lead: {
      findFirst: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let events: { emitLeadClaimed: jest.Mock; emitLeadReleased: jest.Mock };
  let redis: {
    setNxPx: jest.Mock;
    releaseLock: jest.Mock;
  };
  let cache: { invalidate: jest.Mock };
  let service: LmsDataFeedService;

  beforeEach(() => {
    prisma = {
      lead: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    events = {
      emitLeadClaimed: jest.fn(),
      emitLeadReleased: jest.fn(),
    };
    redis = {
      setNxPx: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(undefined),
    };
    cache = { invalidate: jest.fn().mockResolvedValue(undefined) };
    service = new LmsDataFeedService(
      prisma as never,
      events as never,
      redis as never,
      cache as never,
    );
  });

  it("rejects when claim lock is held", async () => {
    redis.setNxPx.mockResolvedValue(false);
    await expect(
      service.claimLead("t1", "lead-1", "user-1"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.lead.findFirst).not.toHaveBeenCalled();
  });

  it("uses updateMany for atomic claim and releases lock", async () => {
    prisma.lead.findFirst
      .mockResolvedValueOnce({
        id: "lead-1",
        assignedToId: null,
        claimHistory: [],
      })
      .mockResolvedValueOnce({
        id: "lead-1",
        assignedToId: "user-1",
        project: { id: "p1", name: "P" },
        assignedTo: { id: "user-1", firstName: "A", lastName: "B" },
      });
    prisma.lead.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.claimLead("t1", "lead-1", "user-1");
    expect(prisma.lead.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "lead-1",
          tenantId: "t1",
          assignedToId: null,
        }),
      }),
    );
    expect(cache.invalidate).toHaveBeenCalledWith("t1", "lms", "crm");
    expect(events.emitLeadClaimed).toHaveBeenCalled();
    expect(redis.releaseLock).toHaveBeenCalled();
    expect(result.assignedToId).toBe("user-1");
  });

  it("conflicts when updateMany wins zero rows", async () => {
    prisma.lead.findFirst.mockResolvedValue({
      id: "lead-1",
      assignedToId: null,
      claimHistory: [],
    });
    prisma.lead.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.claimLead("t1", "lead-1", "user-1"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(redis.releaseLock).toHaveBeenCalled();
  });
});
