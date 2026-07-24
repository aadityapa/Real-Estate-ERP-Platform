import { CacheService } from "./cache.service";
import type { RedisService } from "./redis.service";

describe("CacheService", () => {
  let redis: {
    isReady: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
    incr: jest.Mock;
    expire: jest.Mock;
    setNxPx: jest.Mock;
    releaseLock: jest.Mock;
  };
  let cache: CacheService;

  beforeEach(() => {
    redis = {
      isReady: jest.fn().mockReturnValue(false),
      get: jest.fn(),
      set: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      setNxPx: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn(),
    };
    cache = new CacheService(redis as unknown as RedisService);
  });

  it("getOrSet stores and returns cached value (memory fallback)", async () => {
    const producer = jest.fn().mockResolvedValue({ n: 1 });
    const key = "tenant:t1:cache:crm:0:dashboard";

    const a = await cache.getOrSet(key, producer, 30);
    const b = await cache.getOrSet(key, producer, 30);

    expect(a).toEqual({ n: 1 });
    expect(b).toEqual({ n: 1 });
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it("invalidate bumps namespace version so prior keys miss", async () => {
    const producer = jest.fn().mockResolvedValueOnce({ v: 1 }).mockResolvedValueOnce({
      v: 2,
    });

    const k1 = await cache.buildKey("t1", "crm", ["dashboard"]);
    await cache.getOrSet(k1, producer, 30);
    await cache.invalidate("t1", "crm");
    const k2 = await cache.buildKey("t1", "crm", ["dashboard"]);
    expect(k1).not.toEqual(k2);
    const next = await cache.getOrSet(k2, producer, 30);
    expect(next).toEqual({ v: 2 });
    expect(producer).toHaveBeenCalledTimes(2);
  });
});
