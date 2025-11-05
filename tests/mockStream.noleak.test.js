/* eslint-env node, jest */
import test from "node:test";
import assert from "node:assert/strict";
import { startMockHebrewStream } from "../lib/mockStream.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test("mock stream: no emissions after abort; can restart cleanly", async () => {
  const runOnce = async () => {
    const ac = new AbortController();
    let count = 0;

    // אם ב-lib שלך הקולבק נקרא onChunk/onToken—שנה כאן את onWord בהתאם
    startMockHebrewStream({
      intervalMs: 1,
      signal: ac.signal,
      onLine: () => {
        count++;
      },
    });

    await sleep(12);
    ac.abort();

    const after = count;
    await sleep(8);
    assert.equal(count, after, "no words after abort");

    return count;
  };

  const c1 = await runOnce();
  const c2 = await runOnce();
  assert.ok(c1 >= 2, "first run emitted enough tokens");
  assert.ok(c2 >= 2, "second run emitted enough tokens");
});
