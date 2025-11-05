import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import process from 'node:process';

async function waitFor(url, { tries = 50, delayMs = 200 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
      lastErr = new Error(`Status ${r.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw lastErr ?? new Error('Server not responding: ' + url);
}

async function tryFetch(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

let previewChild = null;

test('UI smoke: dashboard is reachable and shows title', async (t) => {
  // 1) נסה dev על 5173
  let html = await tryFetch('http://localhost:5173/');
  if (!html) {
    // 2) נבנה את הדשבורד ונריץ preview על 5174
    await new Promise((resolve, reject) => {
      const build = spawn('npm', ['run', 'build'], {
        cwd: process.cwd() + '/dashboard',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      });
      build.stdout.on('data', (d) => process.stdout.write(`[WEB-BUILD] ${d}`));
      build.stderr.on('data', (d) => process.stderr.write(`[WEB-BUILD-ERR] ${d}`));
      build.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('build failed'))));
    });

    previewChild = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '5174'], {
      cwd: process.cwd() + '/dashboard',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:3001' },
    });
    previewChild.stdout.on('data', (d) => process.stdout.write(`[WEB-PREVIEW] ${d}`));
    previewChild.stderr.on('data', (d) => process.stderr.write(`[WEB-PREVIEW-ERR] ${d}`));

    await waitFor('http://127.0.0.1:5174/');
    html = await tryFetch('http://127.0.0.1:5174/');
  }

  assert.ok(html, 'ציפינו לקבל HTML מהדפדפן');
  // בודקים טקסט ייחודי בכותרת/כותרת-עליונה
  const markers = [
    'Yossi Record Dashboard',
    'הקלטה + פריסה',          // חלק מהכותרת שלך
    'הקלטות',                  // טאב/עמוד
  ];
  assert.ok(markers.some(m => html.includes(m)), 'הדף לא מכיל מזהה מוכר של הדשבורד');

  // סוגרים preview אם פתחנו
  t.after(() => {
    if (previewChild && !previewChild.killed) {
      previewChild.kill('SIGINT');
    }
  });
});
