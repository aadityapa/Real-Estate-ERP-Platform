import * as fs from "fs";
import * as path from "path";

/**
 * Fails if application source constructs a raw PrismaClient outside the
 * enforced PrismaService (Phase 3.1 acceptance: tenant-owned models must go
 * through the extended client).
 */
describe("enforced Prisma client", () => {
  it("does not construct PrismaClient outside database/prisma.service.ts", () => {
    const srcRoot = path.join(__dirname, "..");
    const allowed = path.normalize(
      path.join(srcRoot, "database", "prisma.service.ts"),
    );
    const offenders: string[] = [];

    function walk(dir: string): void {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === "dist") continue;
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".ts")) continue;
        if (entry.name.endsWith(".spec.ts")) continue;
        const normalized = path.normalize(full);
        if (normalized === allowed) continue;
        const text = fs.readFileSync(full, "utf8");
        if (/new\s+PrismaClient\s*\(/.test(text)) {
          offenders.push(path.relative(srcRoot, full));
        }
      }
    }

    walk(srcRoot);
    expect(offenders).toEqual([]);
  });
});
