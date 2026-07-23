import {
  DR_TARGETS,
  RETENTION_POLICY,
  effectiveRetention,
  retentionDaysFromEnv,
} from "./retention";

describe("retention policy", () => {
  it("exposes RPO/RTO targets", () => {
    expect(DR_TARGETS.rpoMinutes).toBe(15);
    expect(DR_TARGETS.rtoHours).toBe(4);
  });

  it("has positive default retention windows", () => {
    expect(RETENTION_POLICY.postgresBaseBackupDays).toBeGreaterThanOrEqual(7);
    expect(RETENTION_POLICY.postgresPitrDays).toBeGreaterThanOrEqual(1);
    expect(RETENTION_POLICY.s3NoncurrentVersionDays).toBeGreaterThanOrEqual(30);
    expect(RETENTION_POLICY.auditLogDays).toBeGreaterThanOrEqual(365);
  });

  it("reads env overrides and falls back on invalid", () => {
    expect(
      retentionDaysFromEnv("BACKUP_RETENTION_DAYS", 30, {
        BACKUP_RETENTION_DAYS: "14",
      }),
    ).toBe(14);
    expect(
      retentionDaysFromEnv("BACKUP_RETENTION_DAYS", 30, {
        BACKUP_RETENTION_DAYS: "0",
      }),
    ).toBe(30);
    expect(
      retentionDaysFromEnv("BACKUP_RETENTION_DAYS", 30, {
        BACKUP_RETENTION_DAYS: "nope",
      }),
    ).toBe(30);
  });

  it("builds effective retention from env", () => {
    const eff = effectiveRetention({
      BACKUP_RETENTION_DAYS: "21",
      BACKUP_PITR_DAYS: "3",
      S3_NONCURRENT_DAYS: "60",
    });
    expect(eff.postgresBaseBackupDays).toBe(21);
    expect(eff.postgresPitrDays).toBe(3);
    expect(eff.s3NoncurrentVersionDays).toBe(60);
    expect(eff.redisPersistence).toBe("aof-preferred");
  });
});
