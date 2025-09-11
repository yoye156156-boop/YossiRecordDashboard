import test from "node:test";
import assert from "node:assert/strict";
import { startMockHebrewStream } from "../lib/mockStream.js";

test("mock stream emits periodically and stops on abort", async () => {
  const lines = [];
  const ctrl = new AbortController();
  const { stop } = startMockHebrewStream({
    onLine: (s) => lines.push(s),
    signal: ctrl.signal,
    intervalMs: 5, // מהיר לטסטים
  });

  // תן לזמן לעבור כדי לקבל כמה פליטות
  await new Promise((r) => setTimeout(r, 25));
  ctrl.abort();
  stop();

  const countAtAbort = lines.length;
  await new Promise((r) => setTimeout(r, 20)); // לוודא שלא ממשיך אחרי עצירה

  assert.ok(countAtAbort >= 2, "should emit at least 2 lines before abort");
  assert.equal(lines.length, countAtAbort, "should not emit after abort");
});
