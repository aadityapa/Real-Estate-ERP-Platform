import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";

@Injectable()
export class TabLoginsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.tabLoginConfig.findMany({
      where: { tenantId },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            _count: { select: { users: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(
    tenantId: string,
    dto: {
      roleId: string;
      tabId: string;
      label: string;
      allowedTabs: string[];
      defaultTab: string;
      theme?: string;
    },
  ) {
    return this.prisma.tabLoginConfig.create({
      data: { tenantId, ...dto },
      include: { role: { select: { id: true, name: true } } },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<{
      tabId: string;
      label: string;
      allowedTabs: string[];
      defaultTab: string;
      theme: string;
    }>,
  ) {
    const config = await this.prisma.tabLoginConfig.findFirst({
      where: { id, tenantId },
    });
    if (!config) throw new NotFoundException("Tab login config not found");

    return this.prisma.tabLoginConfig.update({
      where: { id },
      data: dto,
      include: { role: { select: { id: true, name: true } } },
    });
  }

  async remove(tenantId: string, id: string) {
    const config = await this.prisma.tabLoginConfig.findFirst({
      where: { id, tenantId },
    });
    if (!config) throw new NotFoundException("Tab login config not found");
    return this.prisma.tabLoginConfig.delete({ where: { id } });
  }

  async getForUser(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: { tabLoginConfigs: true },
            },
          },
        },
      },
    });

    const configs = user.roles.flatMap((ur: { role: { tabLoginConfigs: unknown[] } }) => ur.role.tabLoginConfigs);
    if (configs.length === 0) return null;

    const adminRole = user.roles.some((ur: { role: { name: string } }) =>
      ["Super Admin", "Admin"].includes(ur.role.name),
    );
    if (adminRole) {
      return {
        tabId: "ADMIN_ALL",
        allowedTabs: ["*"],
        defaultTab: "/",
      };
    }

    const merged = new Set<string>();
    for (const c of configs) {
      (c as { allowedTabs: string[] }).allowedTabs.forEach((t: string) => merged.add(t));
    }

    const first = configs[0] as { tabId: string; defaultTab: string; theme?: string };
    return {
      tabId: first.tabId,
      allowedTabs: [...merged],
      defaultTab: first.defaultTab ?? "/",
      theme: first.theme,
    };
  }
}
