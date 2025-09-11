import test from "node:test";
import assert from "node:assert/strict";
import { rms, smooth } from "../lib/audioLevel.js";

test("rms and smooth behave", () => {
  // RMS לדוגמה פשוטה
  const v = rms(new Float32Array([0, 0, 1, -1]));
  assert.ok(v > 0.6 && v < 0.8); // בערך ~0.707

  // smoother(alpha) מחזיר פונקציה שמעדכנת ערך חלק
  const s = smooth(0.5);   // אלפא 0.5
  const a = s(0);          // v=0
  const b = s(1);          // v נע בין 0 ל-1 => 0.5
  assert.equal(a, 0);
  assert.equal(b, 0.5);

  const c = s(1);          // שוב 1 => מתקרב ל-1 => 0.75
  assert.equal(c, 0.75);
});
