import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';

const API_BASE = 'http://localhost:3001';
const UI_URL = 'http://127.0.0.1:5174/';
const UPLOAD_API = `${API_BASE}/api/upload`;
const LIST_API = `${API_BASE}/api/recordings`;

async function waitFor(url, { tries = 60, delayMs = 250 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
      lastErr = new Error(`Status ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw lastErr ?? new Error('Server not responding: ' + url);
}

let apiChild = null;
let webChild = null;

test('🔥 E2E Smoke: API + UI + Upload + Stream check', async (t) => {
  // שלב 1: הרם את ה־API
  apiChild = spawn('node', ['server.cjs'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '3001' },
  });
  apiChild.stdout.on('data', (d) => process.stdout.write(`[API] ${d}`));
  apiChild.stderr.on('data', (d) => process.stderr.write(`[API-ERR] ${d}`));

  await waitFor(LIST_API);
  console.log('✅ API עלה בהצלחה');

  // שלב 2: בנה והרם את ה־UI
  await new Promise((resolve, reject) => {
    const build = spawn('npm', ['run', 'build'], {
      cwd: process.cwd() + '/dashboard',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    build.stdout.on('data', (d) => process.stdout.write(`[BUILD] ${d}`));
    build.stderr.on('data', (d) => process.stderr.write(`[BUILD-ERR] ${d}`));
    build.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('Build failed'))));
  });

  webChild = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '5174'], {
    cwd: process.cwd() + '/dashboard',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, VITE_API_URL: API_BASE },
  });
  webChild.stdout.on('data', (d) => process.stdout.write(`[WEB] ${d}`));
  webChild.stderr.on('data', (d) => process.stderr.write(`[WEB-ERR] ${d}`));

  await waitFor(UI_URL);
  console.log('✅ UI עלה בהצלחה');

  // שלב 3: בדיקת ה־API
  {
    const res = await fetch(LIST_API);
    assert.strictEqual(res.status, 200, 'API אמור להחזיר 200');
    const data = await res.json();
    assert.ok(Array.isArray(data) || typeof data === 'object', 'JSON תקין');
    console.log('✅ API מחזיר רשימת הקלטות תקינה');
  }

  // שלב 4: העלאת קובץ ניסיון
  const tempFile = '/tmp/e2e_test.wav';
  fs.writeFileSync(tempFile, Buffer.alloc(20480, 0x41)); // 20KB — בוודאות עובר סף מינימום
  const formData = new FormData();
  formData.append('file', new Blob([fs.readFileSync(tempFile)]), 'e2e_test.wav');

  const uploadRes = await fetch(UPLOAD_API, { method: 'POST', body: formData });
  assert.strictEqual(uploadRes.status, 200, 'העלאה נכשלה');
  const uploadData = await uploadRes.json();
  assert.ok(uploadData.ok, 'שרת לא החזיר ok');
  const uploadedName = uploadData.name || 'e2e_test.wav';
  console.log('✅ העלאת קובץ בוצעה בהצלחה:', uploadedName);

  // פסק זמן קצר כדי לאפשר ל-FS להשלים כתיבה
  await new Promise(r => setTimeout(r, 150));

  // שלב 5: בדוק שהקובץ נגיש לניגון (בדיקת סטרימינג/טווח)
  const streamUrl = `${API_BASE}/recordings/${encodeURIComponent(uploadedName)}`;

  // בקשת Range כדי לבדוק 206 Partial Content (אם נתמך), או 200 OK
  const streamRes = await fetch(streamUrl, {
    method: 'GET',
    headers: { Range: 'bytes=0-1023' },
  });

  assert.ok([200, 206].includes(streamRes.status), `ציפינו ל-200/206, בפועל: ${streamRes.status}`);

  const ct = streamRes.headers.get('content-type') || '';
  assert.ok(ct.startsWith('audio/'), `Content-Type לא תקין להשמעה: ${ct}`);

  const acceptRanges = streamRes.headers.get('accept-ranges') || '';
  assert.ok(acceptRanges.toLowerCase().includes('bytes'), 'Accept-Ranges אינו bytes');

  const chunk = new Uint8Array(await streamRes.arrayBuffer());
  assert.ok(chunk.byteLength > 0, 'קיבלנו 0 בייט — סטרים לא חזר');

  console.log('✅ סטרימינג/השמעה: Content-Type, Accept-Ranges ו-chunk ראשוני תקינים');

  // שלב 6: בדוק UI מכיל מזהה מוכר
  const html = await fetch(UI_URL).then(r => r.text());
  const markers = [
    'Yossi Record Dashboard',
    'הקלטות',
    'הקלטה + פריסה',
  ];
  assert.ok(markers.some(m => html.includes(m)), 'UI לא הציג מזהה מוכר של הדשבורד');
  console.log('✅ UI הציג את הדשבורד בהצלחה');

  // סגירה נקייה
  t.after(() => {
    if (apiChild && !apiChild.killed) apiChild.kill('SIGINT');
    if (webChild && !webChild.killed) webChild.kill('SIGINT');
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  });
});
