/**
 * Indian data residency helpers (DPDP Act 2023 / Phase 6.3).
 * Default region is ap-south-1 (Mumbai). Storage outside the configured
 * residency region is rejected at config-check and URL-build time.
 */

export const DEFAULT_DATA_RESIDENCY_REGION = "ap-south-1";

export type ResidencyEnv = {
  DATA_RESIDENCY_REGION?: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET?: string;
  AWS_ACCESS_KEY_ID?: string;
  NODE_ENV?: string;
};

/** Effective residency region (defaults to Mumbai). */
export function getConfiguredResidencyRegion(
  env: ResidencyEnv = process.env,
): string {
  const raw = env.DATA_RESIDENCY_REGION?.trim() || DEFAULT_DATA_RESIDENCY_REGION;
  return raw.toLowerCase();
}

/**
 * Fail when AWS_REGION is set and differs from DATA_RESIDENCY_REGION.
 * Called at boot (always when AWS_REGION set) and before S3 URL construction.
 */
export function assertStorageRegionAllowed(
  env: ResidencyEnv = process.env,
): void {
  const residency = getConfiguredResidencyRegion(env);
  const aws = env.AWS_REGION?.trim().toLowerCase();
  if (aws && aws !== residency) {
    throw new Error(
      `AWS_REGION=${aws} violates DATA_RESIDENCY_REGION=${residency}`,
    );
  }
}

/**
 * In production, require an explicit residency region and matching AWS_REGION
 * whenever object storage credentials are present.
 */
export function assertProductionResidencyConfigured(
  env: ResidencyEnv = process.env,
): void {
  if ((env.NODE_ENV ?? "").toLowerCase() !== "production") return;

  const residency = getConfiguredResidencyRegion(env);
  if (!residency) {
    throw new Error("DATA_RESIDENCY_REGION must be set in production");
  }

  const hasStorage =
    Boolean(env.AWS_S3_BUCKET?.trim()) ||
    Boolean(env.AWS_ACCESS_KEY_ID?.trim());
  if (!hasStorage) return;

  const aws = env.AWS_REGION?.trim().toLowerCase();
  if (!aws) {
    throw new Error(
      "AWS_REGION must be set when S3 storage is configured (data residency)",
    );
  }
  assertStorageRegionAllowed(env);
}

/** Extract AWS region from common S3 HTTPS / s3:// URL forms. */
export function extractS3RegionFromUrl(url: string): string | null {
  const raw = url.trim();
  // virtual-hosted: bucket.s3.ap-south-1.amazonaws.com or bucket.s3-ap-south-1.amazonaws.com
  const vh = raw.match(
    /\.s3[.-]([a-z0-9-]+)\.amazonaws\.com/i,
  );
  if (vh?.[1] && vh[1].toLowerCase() !== "amazonaws") {
    return vh[1].toLowerCase();
  }
  // path-style: s3.ap-south-1.amazonaws.com/bucket/...
  const path = raw.match(
    /\/\/s3[.-]([a-z0-9-]+)\.amazonaws\.com\//i,
  );
  if (path?.[1]) return path[1].toLowerCase();
  return null;
}

/**
 * Reject storage URLs whose embedded region differs from residency.
 * Local /storage paths and region-less s3://bucket/key are allowed.
 */
export function assertStorageUrlRegionAllowed(
  url: string,
  env: ResidencyEnv = process.env,
): void {
  const region = extractS3RegionFromUrl(url);
  if (!region) return;
  const residency = getConfiguredResidencyRegion(env);
  if (region !== residency) {
    throw new Error(
      `Storage URL region=${region} violates DATA_RESIDENCY_REGION=${residency}`,
    );
  }
}

/**
 * Build a virtual-hosted S3 HTTPS URL only in the configured residency region.
 */
export function buildResidencyS3ObjectUrl(
  key: string,
  env: ResidencyEnv = process.env,
): string {
  assertStorageRegionAllowed(env);
  const residency = getConfiguredResidencyRegion(env);
  const bucket = env.AWS_S3_BUCKET?.trim();
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET is required to build an S3 object URL");
  }
  const cleanKey = key.replace(/^\/+/, "");
  return `https://${bucket}.s3.${residency}.amazonaws.com/${cleanKey}`;
}

export function getResidencyStatus(env: ResidencyEnv = process.env) {
  const residencyRegion = getConfiguredResidencyRegion(env);
  const awsRegion = env.AWS_REGION?.trim().toLowerCase() || null;
  return {
    residencyRegion,
    awsRegion,
    aligned: !awsRegion || awsRegion === residencyRegion,
    documentation: "docs/DPDP_COMPLIANCE.md",
  };
}
