/**
 * k6 — Phase 7.2 booking creation SLO (reserve path; lighter than full confirm).
 *
 * Usage:
 *   k6 run -e BASE_URL=http://localhost:3001/api/v1 \
 *          -e TOKEN=<jwt> \
 *          -e LEAD_ID=<uuid> \
 *          -e UNIT_ID=<uuid> \
 *          scripts/k6/booking-create.js
 *
 * Note: reserve mutates inventory — use dedicated load-test tenants/units.
 * SLO: p95 < 800ms, error rate < 5% at 5 VUs for 20s (write path).
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3001/api/v1";
const TOKEN = __ENV.TOKEN || "";
const LEAD_ID = __ENV.LEAD_ID || "";
const UNIT_ID = __ENV.UNIT_ID || "";

export const options = {
  vus: 5,
  duration: "20s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<800"],
  },
};

export default function () {
  if (!TOKEN || !LEAD_ID || !UNIT_ID) return;
  const res = http.post(
    `${BASE}/sales/bookings/reserve`,
    JSON.stringify({ leadId: LEAD_ID, unitId: UNIT_ID }),
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    },
  );
  check(res, {
    "reserve accepted or conflict": (r) =>
      r.status === 200 ||
      r.status === 201 ||
      r.status === 400 ||
      r.status === 409,
  });
  sleep(1);
}
