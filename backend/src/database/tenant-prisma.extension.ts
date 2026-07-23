import { Prisma } from "@prisma/client";
import { getTenantStore } from "../common/tenant/tenant-context";
import { isDirectTenantModel } from "./tenant-models";

export class TenantScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantScopeError";
  }
}

const FILTER_WHERE_OPS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

function modelDelegateKey(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function readTenantIdFromData(data: unknown): string | undefined {
  const row = asRecord(data);
  const tid = row?.["tenantId"];
  return typeof tid === "string" ? tid : undefined;
}

export function injectTenantIntoData(
  data: unknown,
  tenantId: string,
): unknown {
  if (Array.isArray(data)) {
    return data.map((row) => injectTenantIntoData(row, tenantId));
  }
  const row = asRecord(data);
  if (!row) return data;
  const existing = readTenantIdFromData(row);
  if (existing && existing !== tenantId) {
    throw new TenantScopeError(
      `Refusing write: data.tenantId (${existing}) does not match TenantContext (${tenantId})`,
    );
  }
  return { ...row, tenantId };
}

export function mergeTenantWhere(
  where: unknown,
  tenantId: string,
): Record<string, unknown> {
  const base = asRecord(where) ?? {};
  const existing = base["tenantId"];
  if (typeof existing === "string" && existing !== tenantId) {
    throw new TenantScopeError(
      `Refusing query: where.tenantId (${existing}) does not match TenantContext (${tenantId})`,
    );
  }
  return { ...base, tenantId };
}

export function requireTenantIdOnWrite(data: unknown, model: string): void {
  if (Array.isArray(data)) {
    for (const row of data) {
      requireTenantIdOnWrite(row, model);
    }
    return;
  }
  if (!readTenantIdFromData(data)) {
    throw new TenantScopeError(
      `Write to ${model} requires tenantId (set TenantContext or pass data.tenantId)`,
    );
  }
}

export function stripTenantIdReassignment(
  data: unknown,
  tenantId: string,
): unknown {
  const row = asRecord(data);
  if (!row || !("tenantId" in row)) return data;
  const next = row["tenantId"];
  if (typeof next === "string" && next !== tenantId) {
    throw new TenantScopeError("Refusing to reassign tenantId on update");
  }
  const { tenantId: _removed, ...rest } = row;
  return rest;
}

type Delegate = {
  findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
};

function getDelegate(client: object, model: string): Delegate {
  const key = modelDelegateKey(model);
  const delegate = (client as Record<string, Delegate | undefined>)[key];
  if (!delegate) {
    throw new TenantScopeError(`No Prisma delegate for model ${model}`);
  }
  return delegate;
}

/** Bypass strict per-model Prisma arg types inside the generic $allOperations hook. */
function callQuery(
  query: (args: never) => Promise<unknown>,
  args: Record<string, unknown>,
): Promise<unknown> {
  return query(args as never);
}

function notFound(model: string, message: string): never {
  throw new Prisma.PrismaClientKnownRequestError(message, {
    code: "P2025",
    clientVersion: Prisma.prismaVersion.client,
    meta: { modelName: model },
  });
}

/**
 * Prisma client extension: when TenantContext has a tenantId, inject it into
 * where/data for DIRECT_TENANT_MODELS. Rejects cross-tenant where/data and
 * writes that omit tenantId when no bypass is active.
 *
 * findUnique / update / delete are rewritten via findFirst ownership checks
 * because Prisma unique inputs cannot include a free-standing tenantId.
 */
export function createTenantScopeExtension() {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: "tenant-scope",
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (!isDirectTenantModel(model)) {
              return query(args);
            }

            const store = getTenantStore();
            if (store?.bypass) {
              return query(args);
            }

            const contextTenantId = store?.tenantId;
            const a = { ...(args as Record<string, unknown>) };

            // No request tenant: still require explicit tenantId on creates.
            if (!contextTenantId) {
              if (operation === "create") {
                requireTenantIdOnWrite(a["data"], model!);
              } else if (operation === "createMany") {
                requireTenantIdOnWrite(a["data"], model!);
              } else if (operation === "upsert") {
                requireTenantIdOnWrite(a["create"], model!);
              }
              return callQuery(query, args as Record<string, unknown>);
            }

            const tenantId = contextTenantId;
            const delegate = getDelegate(client, model!);

            if (operation === "create") {
              a["data"] = injectTenantIntoData(a["data"], tenantId);
              return callQuery(query, a);
            }

            if (operation === "createMany") {
              a["data"] = injectTenantIntoData(a["data"], tenantId);
              return callQuery(query, a);
            }

            if (FILTER_WHERE_OPS.has(operation)) {
              a["where"] = mergeTenantWhere(a["where"], tenantId);
              return callQuery(query, a);
            }

            if (
              operation === "findUnique" ||
              operation === "findUniqueOrThrow"
            ) {
              const result = await delegate.findFirst({
                ...a,
                where: mergeTenantWhere(a["where"], tenantId),
              });
              if (result == null && operation === "findUniqueOrThrow") {
                notFound(model!, "No record was found for a query.");
              }
              return result;
            }

            if (operation === "update") {
              const existing = await delegate.findFirst({
                where: mergeTenantWhere(a["where"], tenantId),
                select: { id: true },
              });
              if (!existing) {
                notFound(model!, "Record to update not found.");
              }
              return callQuery(query, {
                ...a,
                where: { id: String(existing["id"]) },
                data: stripTenantIdReassignment(a["data"], tenantId),
              });
            }

            if (operation === "delete") {
              const existing = await delegate.findFirst({
                where: mergeTenantWhere(a["where"], tenantId),
                select: { id: true },
              });
              if (!existing) {
                notFound(model!, "Record to delete does not exist.");
              }
              return callQuery(query, {
                ...a,
                where: { id: String(existing["id"]) },
              });
            }

            if (operation === "upsert") {
              const create = injectTenantIntoData(a["create"], tenantId);
              const update = stripTenantIdReassignment(
                injectTenantIntoData(a["update"], tenantId),
                tenantId,
              );
              const existing = await delegate.findFirst({
                where: mergeTenantWhere(a["where"], tenantId),
                select: { id: true },
              });
              if (existing) {
                return callQuery(query, {
                  ...a,
                  where: { id: String(existing["id"]) },
                  create,
                  update,
                });
              }
              return callQuery(query, {
                ...a,
                create,
                update,
              });
            }

            return callQuery(query, a);
          },
        },
      },
    }),
  );
}
