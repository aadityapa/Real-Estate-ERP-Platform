/**
 * k6 — Prompt 3.2 noisy-neighbor check.
 *
 * Load tenant A hard while tenant B keeps making progress.
 * Requires two JWTs (same API host) with different tenantIds.
 *
 * Usage:
 *   k6 run -e BASE_URL=http://localhost:3001/api/v1 \
 *          -e TOKEN_A=<jwt-tenant-a> \
 *          -e TOKEN_B=<jwt-tenant-b> \
 *          scripts/k6/tenant-fairness.js
 *
 * Expect: tenant B http_req_failed stays low while A may see 429s from
 * per-tenant rate limiting.
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const BASE = __ENV.BASE_URL || "http://localhost:3001/api/v1";
const TOKEN_A = __ENV.TOKEN_A || "";
const TOKEN_B = __ENV.TOKEN_B || "";

const bFailRate = new Rate("tenant_b_fail_rate");

export const options = {
  scenarios: {
    noisy_a: {
      executor: "constant-arrival-rate",
      rate: 80,
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 20,
      maxVUs: 50,
      exec: "hammerA",
    },
    quiet_b: {
      executor: "constant-arrival-rate",
      rate: 5,
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 5,
      maxVUs: 10,
      exec: "probeB",
      startTime: "2s",
    },
  },
  thresholds: {
    // Tenant B must stay healthy while A is hammered.
    tenant_b_fail_rate: ["rate<0.1"],
  },
};

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function hammerA() {
  if (!TOKEN_A) {
    return;
  }
  http.get(`${BASE}/admin/usage`, { headers: headers(TOKEN_A) });
}

export function probeB() {
  if (!TOKEN_B) {
    bFailRate.add(1);
    return;
  }
  const res = http.get(`${BASE}/admin/usage`, { headers: headers(TOKEN_B) });
  const ok = check(res, {
    "tenant B status 200": (r) => r.status === 200,
  });
  bFailRate.add(!ok);
  sleep(0.1);
}
