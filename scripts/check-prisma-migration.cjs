#!/usr/bin/env node
/**
 * Fails if schema.prisma changed relative to base without a matching
 * migration under backend/prisma/migrations/.
 */
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const schemaRel = "backend/prisma/schema.prisma";
const migrationsDir = path.join(root, "backend/prisma/migrations");

function sh(cmd) {
  try {
    return execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const base = process.env.GITHUB_BASE_REF
  ? `origin/${process.env.GITHUB_BASE_REF}`
  : sh("git rev-parse --verify origin/main")
    ? "origin/main"
    : "HEAD~1";

const diff = sh(`git diff --name-only ${base}...HEAD`);
const changed = diff.split("\n").filter(Boolean);
const schemaChanged = changed.some(
  (f) => f.replace(/\\/g, "/") === schemaRel,
);
const migrationChanged = changed.some((f) =>
  f.replace(/\\/g, "/").startsWith("backend/prisma/migrations/"),
);

if (!schemaChanged) {
  console.log("Prisma schema unchanged — OK");
  process.exit(0);
}

if (!migrationChanged) {
  console.error(
    "ERROR: backend/prisma/schema.prisma changed without a migration under backend/prisma/migrations/",
  );
  process.exit(1);
}

if (!fs.existsSync(migrationsDir)) {
  console.error("ERROR: migrations directory missing");
  process.exit(1);
}

const dirs = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

if (dirs.length === 0) {
  console.error("ERROR: no migration folders found");
  process.exit(1);
}

console.log(
  `Prisma schema + migration present (${dirs.length} migration(s)) — OK`,
);
