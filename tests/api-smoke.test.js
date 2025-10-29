import test from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

async function postJson(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}

test('POST /api/report returns a PDF', async () => {
  const id = Date.now().toString();
  const res = await postJson('/api/report', { id, title: 'בדיקה', date: new Date().toISOString() });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /application\/pdf/);
  const buf = Buffer.from(await res.arrayBuffer());
  assert.ok(buf.length > 300, `expected pdf >300B, got ${buf.length}`);
});

test('POST /api/archive returns .tar.gz', async () => {
  const id = Date.now().toString();
  const res = await postJson('/api/archive', { id, title: 'בדיקה', date: new Date().toISOString() });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /application\/gzip/);
  const buf = Buffer.from(await res.arrayBuffer());
  assert.ok(buf.length > 300, `expected gz >300B, got ${buf.length}`);
});
