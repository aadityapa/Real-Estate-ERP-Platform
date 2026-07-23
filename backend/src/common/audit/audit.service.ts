import { createHash } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

const PII_FIELD_RE =
  /^(email|phone|mobile|aadhaar|pan|bankAccount|accountNumber|ifsc|password|passwordHash|token|refreshToken|portalPassword)$/i;

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export interface AuditDiffInput {
  tenantId: string;
  actorId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  /** Prior field map (optional). Values are hashed — never stored raw. */
  before?: Record<string, unknown> | null;
  /** New field map. Values are hashed — never stored raw. */
  after?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

function valueHash(value: unknown): string {
  const normalized =
    value === undefined
      ? "undefined"
      : value === null
        ? "null"
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

/**
 * Build a stable SHA-256 over "field:valueHash" pairs. Field names of PII keys
 * are kept; raw values are never included.
 */
export function hashAuditSnapshot(
  fields: Record<string, unknown> | null | undefined,
): { hash: string | null; fieldNames: string[] } {
  if (!fields) return { hash: null, fieldNames: [] };
  const names = Object.keys(fields)
    .filter((k) => fields[k] !== undefined)
    .sort();
  if (names.length === 0) return { hash: null, fieldNames: [] };

  const parts = names.map((name) => {
    const raw = fields[name];
    // For known PII keys, hash the value; still only store the hash in the snapshot.
    const hashed = PII_FIELD_RE.test(name)
      ? valueHash(raw)
      : valueHash(raw);
    return `${name}:${hashed}`;
  });
  const hash = createHash("sha256").update(parts.join("|")).digest("hex");
  return { hash, fieldNames: names };
}

export function changedFieldNames(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): string[] {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  const changed: string[] = [];
  for (const key of keys) {
    const b = before?.[key];
    const a = after?.[key];
    if (a === undefined && b === undefined) continue;
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      changed.push(key);
    }
  }
  return changed.sort();
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append-only insert. Failures are logged and swallowed so audit never
   * breaks the primary request path.
   */
  async record(input: AuditDiffInput): Promise<void> {
    try {
      const beforeSnap = hashAuditSnapshot(input.before);
      const afterSnap = hashAuditSnapshot(input.after);
      const changed =
        input.action === "UPDATE"
          ? changedFieldNames(input.before, input.after)
          : afterSnap.fieldNames.length > 0
            ? afterSnap.fieldNames
            : beforeSnap.fieldNames;

      await this.prisma.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.actorId ?? null,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId ?? null,
          beforeHash: beforeSnap.hash,
          afterHash: afterSnap.hash,
          changedFields: changed,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to write AuditLog for ${input.entity}/${input.action}: ${
          err instanceof Error ? err.message : "unknown"
        }`,
      );
    }
  }
}
