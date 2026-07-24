/**
 * k6 — Phase 7.2 realtime feed (HTTP poll + Socket.IO handshake probe).
 *
 * Core k6 does not speak Socket.IO natively; we exercise:
 *  1) REST data-feed list (same backend path that drives the feed UI)
 *  2) Engine.IO polling open against `/events` (proves WS gateway is up)
 *
 * For full Socket.IO claim races, use a multi-instance API + Redis adapter
 * and the claim endpoint under contention (see LOAD_TEST.md).
 *
 * Usage:
 *   k6 run -e BASE_URL=http://localhost:3001/api/v1 \
 *          -e WS_BASE=http://localhost:3001 \
 *          -e TOKEN=<jwt> \
 *          scripts/k6/realtime-feed.js
 *
 * SLO: feed p95 < 500ms; engine.io open succeeds > 99%.
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const BASE = __ENV.BASE_URL || "http://localhost:3001/api/v1";
const WS_BASE = __ENV.WS_BASE || "http://localhost:3001";
const TOKEN = __ENV.TOKEN || "";

const engineOk = new Rate("engineio_open_ok");

export const options = {
  vus: 20,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
    engineio_open_ok: ["rate>0.99"],
  },
};

export default function () {
  if (!TOKEN) return;

  const feed = http.get(`${BASE}/lms/data-feed?status=UNCLAIMED&page=1&limit=20`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  check(feed, { "data-feed 200": (r) => r.status === 200 });

  // Engine.IO handshake (Socket.IO transport). Namespace /events.
  const open = http.get(
    `${WS_BASE}/socket.io/?EIO=4&transport=polling&ns=/events`,
  );
  const ok = open.status === 200;
  engineOk.add(ok);
  check(open, { "engine.io open": () => ok });

  sleep(0.2);
}
