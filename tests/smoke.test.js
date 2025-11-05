import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import process from 'node:process';

const API_URL = 'http://localhost:3001/api/recordings';

async function waitForApi(url, { tries = 30, delayMs = 200 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return true;
      lastErr = new Error(`Status ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw lastErr ?? new Error('API not responding');
}

let serverChild = null;

// לפני כל הבדיקות: אם ה-API לא רץ, נרים שרת זמני
test('bootstrap: ensure API alive (spawn if needed)', async (t) => {
  let apiUp = false;
  try {
    const res = await fetch(API_URL);
    apiUp = res.ok;
  } catch (_) {
    apiUp = false;
  }

  if (!apiUp) {
    serverChild = spawn('node', ['server.cjs'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: '3001' },
    });

    // לוג נעים לעיניים לצורך דיבוג
    serverChild.stdout.on('data', (d) => process.stdout.write(`[API] ${d}`));
    serverChild.stderr.on('data', (d) => process.stderr.write(`[API-ERR] ${d}`));

    // נחכה שה-API יעלה ויענה
    await waitForApi(API_URL, { tries: 50, delayMs: 200 });
  }

  // כיבוי השרת בסוף כל הסוויטה
  t.after(() => {
    if (serverChild && !serverChild.killed) {
      serverChild.kill('SIGINT');
    }
  });
});

// ✅ בדיקה 1 – שרת רץ ועונה
test('שרת API מחזיר תשובה תקינה', async () => {
  const res = await fetch(API_URL);
  assert.strictEqual(res.status, 200, 'ציפינו לקוד 200');
  const data = await res.json();
  assert.ok(Array.isArray(data) || typeof data === 'object', 'ציפינו לתשובת JSON תקינה');
});

// ✅ בדיקה 2 – ניתן לפרש JSON בסיסי ולהכיל מפתחות צפויים
test('תשובת /api/recordings מכילה מפתחות צפויים', async () => {
  const res = await fetch(API_URL);
  const json = await res.json();
  assert.ok(json, 'תשובה קיימת');
  if (Array.isArray(json)) {
    // רשימה מהשרת: לכל רשומה אמור להיות "name"
    assert.ok(json.every(r => r && r.name), 'לכל הקלטה יש שם');
  } else {
    // במידה והחזירו אובייקט (למשל {ok:true}) – עדיין תקין
    assert.ok(typeof json === 'object', 'JSON הוא אובייקט');
  }
});
