/**
 * PropOS data retention & DR targets (Phase 4.3).
 * Operational procedure: docs/DR_RUNBOOK.md
 */

export const DR_TARGETS = {
  /** Recovery Point Objective — max acceptable data loss. */
  rpoMinutes: 15,
  /** Recovery Time Objective — max time to restore service. */
  rtoHours: 4,
} as const;

export type RetentionPolicy = {
  postgresBaseBackupDays: number;
  postgresPitrDays: number;
  s3NoncurrentVersionDays: number;
  s3AbortIncompleteMultipartDays: number;
  auditLogDays: number;
  redisPersistence: "aof-preferred";
};

/**
 * Retention windows used by backup scripts + S3 lifecycle JSON.
 * Values are intentional product defaults; override via env in ops.
 */
export const RETENTION_POLICY: RetentionPolicy = {
  /** Full/base Postgres dumps kept locally or in object storage. */
  postgresBaseBackupDays: 30,
  /** WAL / continuous archive for point-in-time recovery. */
  postgresPitrDays: 7,
  /** Noncurrent (versioned) S3 object versions. */
  s3NoncurrentVersionDays: 90,
  /** Abort incomplete multipart uploads. */
  s3AbortIncompleteMultipartDays: 7,
  /**
   * AuditLog rows are append-only and retained for this window in normal
   * operation. Tenant hard-delete (erasure) removes that tenant's rows under
   * `app.propos_erasure=on` — see migration + DR runbook.
   */
  auditLogDays: 2555, // ~7 years (Indian books / dispute window)
  /** Redis: AOF preferred for BullMQ durability; RDB alone is cache-grade. */
  redisPersistence: "aof-preferred",
};


/** Env override helper — falls back to policy constant when unset/invalid. */
export function retentionDaysFromEnv(
  envKey: string,
  fallback: number,
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env[envKey];
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

export function effectiveRetention(
  env: NodeJS.ProcessEnv = process.env,
): RetentionPolicy {
  return {
    postgresBaseBackupDays: retentionDaysFromEnv(
      "BACKUP_RETENTION_DAYS",
      RETENTION_POLICY.postgresBaseBackupDays,
      env,
    ),
    postgresPitrDays: retentionDaysFromEnv(
      "BACKUP_PITR_DAYS",
      RETENTION_POLICY.postgresPitrDays,
      env,
    ),
    s3NoncurrentVersionDays: retentionDaysFromEnv(
      "S3_NONCURRENT_DAYS",
      RETENTION_POLICY.s3NoncurrentVersionDays,
      env,
    ),
    s3AbortIncompleteMultipartDays: retentionDaysFromEnv(
      "S3_ABORT_MULTIPART_DAYS",
      RETENTION_POLICY.s3AbortIncompleteMultipartDays,
      env,
    ),
    auditLogDays: retentionDaysFromEnv(
      "AUDIT_LOG_RETENTION_DAYS",
      RETENTION_POLICY.auditLogDays,
      env,
    ),
    redisPersistence: RETENTION_POLICY.redisPersistence,
  };
}
