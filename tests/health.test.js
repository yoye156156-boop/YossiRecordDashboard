/* eslint-env node, jest */
import test from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

test("GET /api/health is ok", async () => {
  const res = await fetch(`${BASE}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok(typeof body.uptime_s === "number");
});
