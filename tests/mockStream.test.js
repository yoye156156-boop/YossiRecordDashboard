import test from 'node:test';
import assert from 'node:assert/strict';
import { startMockHebrewStream } from '../lib/mockStream.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

test('emits periodically and stops on abort', async () => {
  const controller = new AbortController();
  const lines = [];

  const { stop } = startMockHebrewStream({
    intervalMs: 5,             // מהיר מאוד לטסטים
    onData: (s) => lines.push(s),
    abortSignal: controller.signal,
  });

  // חכה שיהיו לפחות שתי פליטות
  await sleep(30);
  assert.ok(lines.length >= 2, 'expected at least two emissions before abort');

  // עצור
  controller.abort();
  const afterAbortCount = lines.length;

  // חכה עוד קצת כדי לוודא שאין פליטות נוספות
  await sleep(40);
  assert.equal(lines.length, afterAbortCount, 'no emissions after abort');

  // סגירה בטוחה (idempotent)
  stop();
});
