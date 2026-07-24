/**
 * k6 — Phase 7.2 CRM leads list SLO.
 *
 * Usage:
 *   k6 run -e BASE_URL=http://localhost:3001/api/v1 \
 *          -e TOKEN=<jwt> \
 *          scripts/k6/crm-list.js
 *
 * SLO: p95 < 400ms, error rate < 1% at 30 VUs for 30s.
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3001/api/v1";
const TOKEN = __ENV.TOKEN || "";

export const options = {
  vus: 30,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<400"],
  },
};

export default function () {
  if (!TOKEN) return;
  const res = http.get(`${BASE}/crm/leads?page=1&limit=20`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  check(res, { "crm list 200": (r) => r.status === 200 });
  sleep(0.1);
}
