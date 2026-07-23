import { BadRequestException } from "@nestjs/common";
import {
  assertAllowedMimeType,
  assertUploadSize,
  MAX_UPLOAD_BYTES,
  sanitizeUploadFilename,
} from "./upload-safety";

describe("upload-safety", () => {
  describe("sanitizeUploadFilename", () => {
    it("returns a basename and strips path components", () => {
      expect(sanitizeUploadFilename("folder/deed.pdf")).toBe("deed.pdf");
      expect(sanitizeUploadFilename("..\\..\\etc\\passwd")).toBe("passwd");
    });

    it("rejects empty, dots, and control characters", () => {
      expect(() => sanitizeUploadFilename("..")).toThrow(BadRequestException);
      expect(() => sanitizeUploadFilename("bad\0name.pdf")).toThrow(
        BadRequestException,
      );
      expect(() => sanitizeUploadFilename("name?.pdf")).toThrow(
        BadRequestException,
      );
    });
  });

  describe("assertAllowedMimeType", () => {
    it("allows pdf and common office types", () => {
      expect(() => assertAllowedMimeType("application/pdf")).not.toThrow();
      expect(() =>
        assertAllowedMimeType(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
      ).not.toThrow();
    });

    it("rejects executables", () => {
      expect(() => assertAllowedMimeType("application/x-msdownload")).toThrow(
        BadRequestException,
      );
    });
  });

  describe("assertUploadSize", () => {
    it("rejects oversized files", () => {
      expect(() => assertUploadSize(MAX_UPLOAD_BYTES + 1)).toThrow(
        BadRequestException,
      );
    });

    it("allows sizes within the limit", () => {
      expect(() => assertUploadSize(1024)).not.toThrow();
    });
  });
});
