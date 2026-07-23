import { Prisma } from "@prisma/client";
import {
  decryptBankDetailsFields,
  decryptCustomerFields,
  encryptBankDetailsFields,
  encryptCustomerFields,
} from "../common/utils/pii-crypto";

const WRITE_OPS = new Set([
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
]);

function encryptWriteArgs(model: string | undefined, args: Record<string, unknown>): void {
  if (!model || !args) return;

  if (model === "Customer") {
    if (args["data"] && typeof args["data"] === "object") {
      const data = args["data"] as Record<string, unknown>;
      if (Array.isArray(data)) {
        args["data"] = data.map((row) =>
          encryptCustomerFields(row as { pan?: string; aadhaar?: string }),
        );
      } else {
        args["data"] = encryptCustomerFields(
          data as { pan?: string; aadhaar?: string },
        );
      }
    }
    if (args["create"] && typeof args["create"] === "object") {
      args["create"] = encryptCustomerFields(
        args["create"] as { pan?: string; aadhaar?: string },
      );
    }
    if (args["update"] && typeof args["update"] === "object") {
      args["update"] = encryptCustomerFields(
        args["update"] as { pan?: string; aadhaar?: string },
      );
    }
  }

  if (model === "Employee" || model === "Vendor") {
    if (args["data"] && typeof args["data"] === "object" && !Array.isArray(args["data"])) {
      args["data"] = encryptBankDetailsFields(
        args["data"] as { bankDetails?: unknown },
      );
    }
    if (Array.isArray(args["data"])) {
      args["data"] = (args["data"] as { bankDetails?: unknown }[]).map((row) =>
        encryptBankDetailsFields(row),
      );
    }
    if (args["create"] && typeof args["create"] === "object") {
      args["create"] = encryptBankDetailsFields(
        args["create"] as { bankDetails?: unknown },
      );
    }
    if (args["update"] && typeof args["update"] === "object") {
      args["update"] = encryptBankDetailsFields(
        args["update"] as { bankDetails?: unknown },
      );
    }
  }
}

function decryptDeep(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => decryptDeep(item, seen));
  }
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value;
  if (seen.has(value)) return value;
  seen.add(value);

  const record = value as Record<string, unknown>;
  // Customer-shaped
  if ("pan" in record || "aadhaar" in record) {
    Object.assign(
      record,
      decryptCustomerFields(record as { pan?: string; aadhaar?: string }),
    );
  }
  // Employee / Vendor bank details
  if ("bankDetails" in record) {
    Object.assign(
      record,
      decryptBankDetailsFields(record as { bankDetails?: unknown }),
    );
  }

  for (const [k, v] of Object.entries(record)) {
    if (v && typeof v === "object") {
      record[k] = decryptDeep(v, seen);
    }
  }
  return record;
}

/**
 * Transparent AES-256-GCM encrypt on write / decrypt on read for:
 * Customer.pan, Customer.aadhaar (last-4), Employee|Vendor.bankDetails.
 */
export const piiEncryptionExtension = Prisma.defineExtension({
  name: "pii-encryption",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (WRITE_OPS.has(operation)) {
          encryptWriteArgs(model, args as Record<string, unknown>);
        }
        const result = await query(args);
        if (result != null && operation !== "count" && operation !== "aggregate") {
          return decryptDeep(result);
        }
        return result;
      },
    },
  },
});
