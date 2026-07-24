#!/usr/bin/env node
/**
 * Filter Trivy JSON vs infrastructure/docker/trivy-allowlist.txt.
 * Exit 1 if any HIGH/CRITICAL finding remains after allowlist.
 */
const fs = require("fs");
const path = require("path");

const reportPath = process.argv[2];
const allowPath =
  process.argv[3] ||
  path.join(__dirname, "../infrastructure/docker/trivy-allowlist.txt");

if (!reportPath || !fs.existsSync(reportPath)) {
  console.error("Usage: node scripts/trivy-gate.cjs <trivy-report.json> [allowlist]");
  process.exit(2);
}

const allow = new Set(
  fs
    .readFileSync(allowPath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#")),
);

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const results = Array.isArray(report) ? report : report.Results || [];
const bad = [];

for (const result of results) {
  for (const vuln of result.Vulnerabilities || []) {
    const sev = (vuln.Severity || "").toUpperCase();
    if (sev !== "HIGH" && sev !== "CRITICAL") continue;
    const id = vuln.VulnerabilityID || "";
    const pkg = `${vuln.PkgName}@${vuln.InstalledVersion}`;
    if (allow.has(id) || allow.has(pkg)) continue;
    bad.push({ id, sev, pkg, title: vuln.Title });
  }
}

if (bad.length) {
  console.error(`Trivy gate failed: ${bad.length} HIGH/CRITICAL finding(s)`);
  for (const b of bad.slice(0, 50)) {
    console.error(`  [${b.sev}] ${b.id} ${b.pkg} — ${b.title || ""}`);
  }
  process.exit(1);
}

console.log("Trivy gate passed (no unallowlisted HIGH/CRITICAL)");
