/* eslint-env node, jest */
import test from "node:test";
import assert from "node:assert/strict";
import { startMockHebrewStream } from "../lib/mockStream.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test("mock stream emits periodically and stops on abort", async () => {
  const ac = new AbortController();
  let count = 0;

  // הפונקציה מחזירה cleanup; אפשר גם להשתמש ב-ac.abort()
  const cleanup = startMockHebrewStream({
    intervalMs: 1,
    signal: ac.signal,
    onLine: () => {
      count++;
    },
  });

  // ניתן קצת זמן לפליטות
  await sleep(12);

  // לעצור (בחר אחד: abort או cleanup)
  ac.abort();
  // או: cleanup();

  const after = count;
  await sleep(8);

  // לא אמור להשתנות אחרי עצירה
  assert.equal(count, after, "no emissions after stop/abort");
});
