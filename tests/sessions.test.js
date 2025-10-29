import test from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

test('GET /api/sessions returns an array', async () => {
  const res = await fetch(`${BASE}/api/sessions`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data));
});

test('DELETE /api/sessions clears and returns ok', async () => {
  const res = await fetch(`${BASE}/api/sessions`, { method: 'DELETE' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
});
