import { Injectable, Logger } from "@nestjs/common";
import { existsSync } from "fs";
import { unlink } from "fs/promises";
import { join, resolve, sep } from "path";
import { ParsedStorageRef } from "./storage-keys";

export interface PurgeResult {
  deleted: string[];
  failed: Array<{ key: string; reason: string }>;
  /** S3 keys queued when AWS CLI / credentials unavailable. */
  deferredS3Keys: string[];
}

/**
 * Purges local `/storage` files and best-effort S3 objects (via AWS CLI when
 * configured). Avoids adding `@aws-sdk` until document upload uses it.
 */
@Injectable()
export class StoragePurger {
  private readonly logger = new Logger(StoragePurger.name);

  constructor(
    private readonly storageRoot = join(process.cwd(), "storage"),
    private readonly runAws: (
      args: string[],
    ) => Promise<{ ok: boolean; stderr: string }> = defaultAwsRunner,
  ) {}

  async purge(refs: ParsedStorageRef[]): Promise<PurgeResult> {
    const deleted: string[] = [];
    const failed: Array<{ key: string; reason: string }> = [];
    const deferredS3Keys: string[] = [];
    const s3Keys: string[] = [];
    const bucket =
      process.env["AWS_S3_BUCKET"]?.trim() || undefined;

    for (const ref of refs) {
      if (ref.kind === "local") {
        const root = resolve(this.storageRoot);
        const abs = resolve(root, ref.key);
        if (abs !== root && !abs.startsWith(root + sep)) {
          failed.push({ key: ref.key, reason: "path-escape" });
          continue;
        }
        try {
          if (existsSync(abs)) {
            await unlink(abs);
            deleted.push(`local:${ref.key}`);
          } else {
            deleted.push(`local-missing:${ref.key}`);
          }
        } catch (err) {
          failed.push({
            key: ref.key,
            reason: err instanceof Error ? err.message : "unlink-failed",
          });
        }
      } else if (ref.kind === "s3") {
        s3Keys.push(ref.key);
      }
    }

    if (s3Keys.length === 0) {
      return { deleted, failed, deferredS3Keys };
    }

    const canAws =
      Boolean(bucket) &&
      Boolean(process.env["AWS_ACCESS_KEY_ID"]?.trim()) &&
      Boolean(process.env["AWS_SECRET_ACCESS_KEY"]?.trim());

    if (!canAws) {
      this.logger.warn(
        `S3 purge deferred for ${s3Keys.length} key(s); set AWS_S3_BUCKET + credentials or run aws s3 rm`,
      );
      deferredS3Keys.push(...s3Keys);
      return { deleted, failed, deferredS3Keys };
    }

    // Batch delete via AWS CLI (available in prod images / ops laptops)
    const batches = chunk(s3Keys, 1000);
    for (const batch of batches) {
      const objects = JSON.stringify({
        Objects: batch.map((Key) => ({ Key })),
        Quiet: true,
      });
      const result = await this.runAws([
        "s3api",
        "delete-objects",
        "--bucket",
        bucket!,
        "--delete",
        objects,
      ]);
      if (result.ok) {
        for (const k of batch) deleted.push(`s3:${k}`);
      } else {
        this.logger.warn(`S3 delete-objects failed: ${result.stderr}`);
        deferredS3Keys.push(...batch);
        failed.push({
          key: `batch:${batch.length}`,
          reason: result.stderr || "aws-cli-failed",
        });
      }
    }

    return { deleted, failed, deferredS3Keys };
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function defaultAwsRunner(
  args: string[],
): Promise<{ ok: boolean; stderr: string }> {
  try {
    // Dynamic import keeps tests / Windows CI free of aws binary hard-fail
    const { spawn } = await import("child_process");
    return await new Promise((resolve) => {
      const child = spawn("aws", args, {
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stderr = "";
      child.stderr?.on("data", (d: Buffer) => {
        stderr += d.toString();
      });
      child.on("error", (err) => {
        resolve({ ok: false, stderr: err.message });
      });
      child.on("close", (code) => {
        resolve({ ok: code === 0, stderr });
      });
    });
  } catch (err) {
    return {
      ok: false,
      stderr: err instanceof Error ? err.message : "aws-spawn-failed",
    };
  }
}
