/**
 * k6 — Phase 7.2 login SLO.
 *
 * Usage:
 *   k6 run -e BASE_URL=http://localhost:3001/api/v1 \
 *          -e EMAIL=admin@example.com \
 *          -e PASSWORD=Secret123! \
 *          scripts/k6/login.js
 *
 * SLO: p95 < 500ms, error rate < 1% at 20 VUs for 30s.
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3001/api/v1";
const EMAIL = __ENV.EMAIL || "";
const PASSWORD = __ENV.PASSWORD || "";

export const options = {
  vus: 20,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

export default function () {
  if (!EMAIL || !PASSWORD) {
    return;
  }
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(res, {
    "login 200/201": (r) => r.status === 200 || r.status === 201,
  });
  sleep(0.2);
}
