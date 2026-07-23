import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";
import { TenantContext } from "../../../common/tenant/tenant-context";
import { collectStorageRefs } from "../../../common/lifecycle/storage-keys";
import { StoragePurger } from "../../../common/lifecycle/storage-purger";
import { TENANT_DELETE_STEPS } from "../../../common/lifecycle/tenant-delete-sql";
import { effectiveRetention, DR_TARGETS } from "../../../common/lifecycle/retention";

export interface TenantExportPackage {
  exportedAt: string;
  schemaVersion: 1;
  retention: ReturnType<typeof effectiveRetention>;
  drTargets: typeof DR_TARGETS;
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    createdAt: string;
  };
  users: Array<Record<string, unknown>>;
  customers: Array<Record<string, unknown>>;
  companies: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  leads: Array<Record<string, unknown>>;
  vendors: Array<Record<string, unknown>>;
  counts: Record<string, number>;
}

@Injectable()
export class LifecycleService {
  private readonly logger = new Logger(LifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly storagePurger: StoragePurger,
  ) {}

  /**
   * GDPR / DPDP portability export for the caller's tenant.
   * Omits password hashes and session tokens; includes decrypted PII via Prisma extension.
   */
  async exportTenant(tenantId: string): Promise<TenantExportPackage> {
    return this.tenantContext.runAsSystem(async () => {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      if (!tenant) throw new NotFoundException("Tenant not found");

      const [users, customers, companies, documents, leads, vendors, counts] =
        await Promise.all([
          this.prisma.user.findMany({
            where: { tenantId },
            select: {
              id: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              status: true,
              createdAt: true,
              lastLoginAt: true,
            },
          }),
          this.prisma.customer.findMany({ where: { tenantId } }),
          this.prisma.company.findMany({ where: { tenantId } }),
          this.prisma.document.findMany({
            where: { tenantId },
            select: {
              id: true,
              name: true,
              category: true,
              fileUrl: true,
              fileSize: true,
              mimeType: true,
              createdAt: true,
              expiresAt: true,
            },
          }),
          this.prisma.lead.findMany({
            where: { tenantId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
              source: true,
              createdAt: true,
            },
          }),
          this.prisma.vendor.findMany({
            where: { tenantId },
            select: {
              id: true,
              name: true,
              type: true,
              email: true,
              phone: true,
              gstin: true,
              status: true,
              createdAt: true,
            },
          }),
          this.countSummary(tenantId),
        ]);

      return {
        exportedAt: new Date().toISOString(),
        schemaVersion: 1,
        retention: effectiveRetention(),
        drTargets: DR_TARGETS,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          status: tenant.status,
          createdAt: tenant.createdAt.toISOString(),
        },
        users: users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        })),
        customers: customers.map((c) => serializeRow(c)),
        companies: companies.map((c) => serializeRow(c)),
        documents: documents.map((d) => serializeRow(d)),
        leads: leads.map((l) => serializeRow(l)),
        vendors: vendors.map((v) => serializeRow(v)),
        counts,
      };
    });
  }

  /**
   * Right-to-erasure hard delete. Requires confirmSlug === tenant.slug.
   * Purges DB rows (incl. AuditLog under erasure GUC) then storage objects.
   */
  async hardDeleteTenant(
    tenantId: string,
    confirmSlug: string,
  ): Promise<{
    tenantId: string;
    steps: string[];
    storage: Awaited<ReturnType<StoragePurger["purge"]>>;
  }> {
    const tenant = await this.tenantContext.runAsSystem(() =>
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
    );
    if (!tenant) throw new NotFoundException("Tenant not found");
    if (confirmSlug !== tenant.slug) {
      throw new BadRequestException(
        "confirmSlug must exactly match the tenant slug",
      );
    }

    const docs = await this.tenantContext.runAsSystem(() =>
      this.prisma.document.findMany({
        where: { tenantId },
        select: { fileUrl: true },
      }),
    );
    const versions = await this.tenantContext.runAsSystem(() =>
      this.prisma.documentVersion.findMany({
        where: { document: { tenantId } },
        select: { fileUrl: true },
      }),
    );
    const urls = [
      ...docs.map((d) => d.fileUrl),
      ...versions.map((v) => v.fileUrl),
    ];
    const refs = collectStorageRefs(urls);

    const steps = await this.tenantContext.runAsSystem(() =>
      this.prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.propos_erasure', 'on', true)`;
          const done: string[] = [];
          for (const step of TENANT_DELETE_STEPS) {
            await tx.$executeRawUnsafe(step.sql, tenantId);
            done.push(step.label);
          }
          return done;
        },
        { timeout: 120_000 },
      ),
    );

    this.logger.log(
      `Tenant hard-delete completed steps=${steps.length} tenantId=${tenantId}`,
    );

    const storage = await this.storagePurger.purge(refs);
    return { tenantId, steps, storage };
  }

  private async countSummary(
    tenantId: string,
  ): Promise<Record<string, number>> {
    const [users, customers, companies, documents, leads, vendors, auditLogs] =
      await Promise.all([
        this.prisma.user.count({ where: { tenantId } }),
        this.prisma.customer.count({ where: { tenantId } }),
        this.prisma.company.count({ where: { tenantId } }),
        this.prisma.document.count({ where: { tenantId } }),
        this.prisma.lead.count({ where: { tenantId } }),
        this.prisma.vendor.count({ where: { tenantId } }),
        this.prisma.auditLog.count({ where: { tenantId } }),
      ]);
    return {
      users,
      customers,
      companies,
      documents,
      leads,
      vendors,
      auditLogs,
    };
  }

}

/** JSON-safe row (Dates → ISO, BigInt → string). */
function serializeRow(row: object): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(row, (_k, v: unknown) =>
      typeof v === "bigint" ? v.toString() : v,
    ),
  ) as Record<string, unknown>;
}
