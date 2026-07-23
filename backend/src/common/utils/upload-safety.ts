import { BadRequestException } from "@nestjs/common";

/** Max accepted document size when clients report fileSize (25 MiB). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** MIME types allowed for document metadata / future multipart uploads. */
export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const UNSAFE_FILENAME_RE = /[\\/:\0<>"|?*\x00-\x1f]/;

/**
 * Strip path components and reject traversal / control characters.
 * Returns a safe basename suitable for object keys.
 */
export function sanitizeUploadFilename(original: string): string {
  const base = original.replace(/\\/g, "/").split("/").pop() ?? "";
  const trimmed = base.trim();
  if (!trimmed || trimmed === "." || trimmed === "..") {
    throw new BadRequestException({
      code: "INVALID_FILENAME",
      message: "Invalid upload filename",
    });
  }
  if (UNSAFE_FILENAME_RE.test(trimmed) || trimmed.includes("..")) {
    throw new BadRequestException({
      code: "INVALID_FILENAME",
      message: "Upload filename contains unsafe characters",
    });
  }
  if (trimmed.length > 200) {
    throw new BadRequestException({
      code: "INVALID_FILENAME",
      message: "Upload filename is too long",
    });
  }
  return trimmed;
}

export function assertAllowedMimeType(mimeType: string | undefined): void {
  if (mimeType == null || mimeType === "") return;
  const normalized = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(normalized)) {
    throw new BadRequestException({
      code: "INVALID_MIME_TYPE",
      message: `MIME type not allowed: ${normalized}`,
    });
  }
}

export function assertUploadSize(fileSize: number | undefined): void {
  if (fileSize == null) return;
  if (!Number.isFinite(fileSize) || fileSize < 0) {
    throw new BadRequestException({
      code: "INVALID_FILE_SIZE",
      message: "Invalid file size",
    });
  }
  if (fileSize > MAX_UPLOAD_BYTES) {
    throw new BadRequestException({
      code: "FILE_TOO_LARGE",
      message: `File exceeds maximum size of ${MAX_UPLOAD_BYTES} bytes`,
    });
  }
}
