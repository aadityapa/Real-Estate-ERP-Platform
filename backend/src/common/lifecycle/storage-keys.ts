/**
 * Extract object-storage keys / local paths from Document.fileUrl-style values.
 * Supports s3://, https://bucket.s3..., CloudFront-style paths, and /storage/...
 */

const S3_URI = /^s3:\/\/([^/]+)\/(.+)$/i;
const S3_VIRTUAL_HOST =
  /^https?:\/\/([^.]+)\.s3[.-][a-z0-9.-]+\.amazonaws\.com\/(.+)$/i;
const S3_PATH_STYLE =
  /^https?:\/\/s3[.-][a-z0-9.-]+\.amazonaws\.com\/([^/]+)\/(.+)$/i;

export interface ParsedStorageRef {
  /** Kind of reference for purge routing. */
  kind: "s3" | "local" | "unknown";
  /** S3 object key or local path relative to storage root (no leading slash). */
  key: string;
  bucket?: string;
}

/** Strip query string (signed URL params) and fragments. */
export function stripUrlQuery(url: string): string {
  const q = url.indexOf("?");
  const h = url.indexOf("#");
  let end = url.length;
  if (q >= 0) end = Math.min(end, q);
  if (h >= 0) end = Math.min(end, h);
  return url.slice(0, end);
}

export function parseStorageRef(fileUrl: string): ParsedStorageRef {
  const raw = stripUrlQuery(fileUrl.trim());
  if (!raw) return { kind: "unknown", key: "" };

  const s3 = raw.match(S3_URI);
  if (s3?.[1] && s3[2]) {
    return { kind: "s3", bucket: s3[1], key: decodeURIComponent(s3[2]) };
  }

  const vh = raw.match(S3_VIRTUAL_HOST);
  if (vh?.[1] && vh[2]) {
    return { kind: "s3", bucket: vh[1], key: decodeURIComponent(vh[2]) };
  }

  const pathStyle = raw.match(S3_PATH_STYLE);
  if (pathStyle?.[1] && pathStyle[2]) {
    return {
      kind: "s3",
      bucket: pathStyle[1],
      key: decodeURIComponent(pathStyle[2]),
    };
  }

  // Local / signed storage path: /storage/receipts/x.pdf
  if (raw.startsWith("/storage/")) {
    return { kind: "local", key: raw.slice("/storage/".length) };
  }
  if (raw.startsWith("storage/")) {
    return { kind: "local", key: raw.slice("storage/".length) };
  }

  // CloudFront or CDN: https://cdn.example/tenant/... — treat path as S3 key
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      const u = new URL(raw);
      const key = u.pathname.replace(/^\/+/, "");
      if (key) return { kind: "s3", key: decodeURIComponent(key) };
    }
  } catch {
    // fall through
  }

  return { kind: "unknown", key: raw };
}

export function collectStorageRefs(urls: string[]): ParsedStorageRef[] {
  const seen = new Set<string>();
  const out: ParsedStorageRef[] = [];
  for (const url of urls) {
    if (!url) continue;
    const ref = parseStorageRef(url);
    if (!ref.key || ref.kind === "unknown") continue;
    const id = `${ref.kind}:${ref.bucket ?? ""}:${ref.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(ref);
  }
  return out;
}
