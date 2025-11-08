import fetch from "node-fetch";
import puppeteer from "puppeteer";
import { marked } from "marked";
import { installNotes } from "./notesRoutes.mjs";
import express from "express";
import multer from "multer";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import fsp from "fs/promises";

// --- Path setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Express app ---
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// --- Directories & ENV ---
const PORT = process.env.PORT || 3001;
const RECORDINGS_DIR = process.env.RECORDINGS_DIR || path.join(__dirname, "recordings");
const NOTES_DIR = path.join(RECORDINGS_DIR, "notes");

// יצירת תיקיות במידת הצורך
for (const dir of [RECORDINGS_DIR, NOTES_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// --- המשך קוד השרת שלך כאן ---

// --- Multer storage ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, RECORDINGS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^\p{L}\p{N}_\-. ]/gu, '_');
    cb(null, `${base}${ext}`);
  }
});
const upload = multer({ storage });

// --- Helpers ---
function toItemStats(p) {
  const st = fsp.statSync(p);
  const ext = path.extname(p);
  const mime =
    ext === '.webm' ? 'video/webm' :
    ext === '.wav'  ? 'audio/wav'  :
                      'application/octet-stream';
  return {
    name: path.basename(p),
    sizeKB: Math.round(st.size / 1024),
    ext,
    mime,
    mtime: st.mtimeMs,
    mtimeISO: new Date(st.mtimeMs).toISOString()
  };
}

async function safeWriteJSON(absPath, obj) {
  await fsp.writeFile(absPath, JSON.stringify(obj, null, 2), 'utf8');
}

function baseOf(name) {
  const ext = path.extname(name);
  return path.basename(name, ext);
}

// --- Routes ---
app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// List recordings
app.get("/api/recordings", async (_req, res) => {
  try {
    const files = await fsp.readdir(RECORDINGS_DIR);
    const list = files
      .filter((f) => f.toLowerCase().endsWith(".webm"))
      .sort();
    res.set("Cache-Control", "no-store");
    res.json(list); // ← עכשיו מחזיר רק מערך
  } catch (e) {
    console.error("list error:", e);
    res.status(500).json({ error: "list failed" });
  }
});

// Upload recording
app.post('/api/upload', upload.single('file'), (req, res) => {
if (req.file && req.file.filename) {
  const name = req.file.filename;
  console.log(`🎧 קובץ הועלה: ${name} — מתחיל יצירת כתב אחרי...`);

  fetch(`http://127.0.0.1:${PORT}/api/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })
  .then(r => r.json())
  .then(js => {
    if (js.ok) {
      console.log(`🧠 נוצר כתב אחרי אוטומטי עבור ${name}`);
    } else {
      console.warn(`⚠️ שגיאה ביצירת כתב אחרי:`, js.error);
    }
  })
  .catch(err => console.error(`❌ שגיאה בפנייה ל-/api/transcribe:`, err));
}
  res.json({ ok: true, name: req.file?.filename });
});

// Rename recording
app.put('/api/recordings/:name', async (req, res) => {
  try {
    const oldName = req.params.name;
    const { newName } = req.body || {};
    if (!newName) return res.status(400).json({ ok: false, error: 'newName required' });

    const oldPath = path.join(RECORDINGS_DIR, oldName);
    if (!fs.existsSync(oldPath)) return res.status(404).json({ ok: false, error: 'not found' });

    const currentExt = path.extname(oldName);
    const reqExt = path.extname(newName);
    const finalName = reqExt ? newName : newName + currentExt;
    const safe = finalName.replace(/[^\p{L}\p{N}_\-. ]/gu, '_');

    const newPath = path.join(RECORDINGS_DIR, safe);
    await fsp.rename(oldPath, newPath);

    // move side files (markers + notes) if exist
    const oldBase = baseOf(oldName);
    const newBase = baseOf(safe);

    const maybeMove = async (dir, ext) => {
      const from = path.join(dir, `${oldBase}${ext}`);
      if (fs.existsSync(from)) {
        await fsp.rename(from, path.join(dir, `${newBase}${ext}`));
      }
    };
    await maybeMove(RECORDINGS_DIR, '.json'); // markers JSON
    await maybeMove(NOTES_DIR, '.json');      // summary JSON
    await maybeMove(NOTES_DIR, '.md');        // summary MD
    if (req.file && req.file.filename) {
  const name = req.file.filename;
  console.log(`🎧 קובץ הועלה: ${name} — מתחיל יצירת כתב אחרי...`);

  // קריאה פנימית ל-/api/transcribe
  fetch(`http://127.0.0.1:${PORT}/api/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })
  .then(r => r.json())
  .then(js => {
    if (js.ok) {
      console.log(`🧠 נוצר כתב אחרי אוטומטי עבור ${name}`);
    } else {
      console.warn(`⚠️ שגיאה ביצירת כתב אחרי:`, js.error);
    }
  })
  .catch(err => console.error(`❌ שגיאה בפנייה ל-/api/transcribe:`, err));
}
    res.json({ ok: true, name: safe });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Delete recording (+ markers)
app.delete('/api/recordings/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const p = path.join(RECORDINGS_DIR, name);
    if (!fs.existsSync(p)) return res.status(404).json({ ok: false, error: 'not found' });
    await fsp.unlink(p);
    const base = baseOf(name);
    for (const ext of ['.json']) {
      const side = path.join(RECORDINGS_DIR, `${base}${ext}`);
      if (fs.existsSync(side)) await fsp.unlink(side);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Stream recording
app.get('/recordings/:name', async (req, res) => {
  const p = path.join(RECORDINGS_DIR, req.params.name);
  if (!fs.existsSync(p)) return res.status(404).end();
  const stat = await fsp.stat(p);
  res.setHeader('Cache-Control', 'no-store');
  const range = req.headers.range;
  if (!range) {
    res.writeHead(200, { 'Content-Length': stat.size });
    fs.createReadStream(p).pipe(res);
    return;
  }
  const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
  const start = parseInt(startStr, 10);
  const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
  const chunksize = end - start + 1;
  const file = fs.createReadStream(p, { start, end });
  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunksize
  });
  file.pipe(res);
});

// Save markers
app.post('/api/recordings/:name/markers', async (req, res) => {
  try {
    const { name } = req.params;
    const base = baseOf(name);
    const recPath = path.join(RECORDINGS_DIR, name);
    if (!fs.existsSync(recPath)) return res.status(404).json({ ok: false, error: 'recording not found' });
    const markers = Array.isArray(req.body?.markers) ? req.body.markers : [];
    const payload = { recording: name, markers, savedAt: new Date().toISOString() };
    await safeWriteJSON(path.join(RECORDINGS_DIR, `${base}.json`), payload);
    res.json({ ok: true, markers: payload });
  } catch (e) {
if (req.file && req.file.filename) {
  const name = req.file.filename;
  console.log(`🎧 קובץ הועלה: ${name} — מתחיל יצירת כתב אחרי...`);

  // קריאה פנימית ל-/api/transcribe
  fetch(`http://127.0.0.1:${PORT}/api/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })
  .then(r => r.json())
  .then(js => {
    if (js.ok) {
      console.log(`🧠 נוצר כתב אחרי אוטומטי עבור ${name}`);
    } else {
      console.warn(`⚠️ שגיאה ביצירת כתב אחרי:`, js.error);
    }
  })
  .catch(err => console.error(`❌ שגיאה בפנייה ל-/api/transcribe:`, err));
}
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Summarize (mock)
app.post('/api/summarize', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, error: 'name required' });
    const recPath = path.join(RECORDINGS_DIR, name);
    if (!fs.existsSync(recPath)) return res.status(404).json({ ok: false, error: 'recording not found' });

    const base = baseOf(name);
    const markersPath = path.join(RECORDINGS_DIR, `${base}.json`);
    let markers = [];
    if (fs.existsSync(markersPath)) {
      try {
        const js = JSON.parse(await fsp.readFile(markersPath, 'utf8'));
        markers = js.markers || [];
      } catch {}
    }

    const now = new Date().toISOString();
    const summary = {
      recording: name,
      createdAt: now,
      mood: 'מתוח/ה בתחילת הפגישה, רגוע/ה בסופה',
      automaticThoughts: [
        'אם אני לא אצליח – זה אומר שאני כישלון',
        'הם ישפטו אותי אם אתבלבל'
      ],
      cognitiveDistortions: ['הכל או כלום', 'קריאת מחשבות', 'הכללה מוגזמת'],
      keyMoments: markers.slice(0, 5),
      challenges: ['הימנעות משיחות קשות', 'דחיינות'],
      homework: [
        'תרגול נשימות 4-7-8 פעמיים ביום',
        'ניסוי התנהגותי: שיחה קצרה יזומה עם עמית'
      ],
      followUps: ['בדיקת תדירות מחשבות שליליות בשבוע הבא']
    };

    const md =
`# כתב אחרי – ${base}

**תאריך:** ${now}

**מצב רגשי:** ${summary.mood}

**מחשבות אוטומטיות:**
- ${summary.automaticThoughts.join('\n- ')}

**עיוותים קוגניטיביים:**
- ${summary.cognitiveDistortions.join('\n- ')}

**רגעי מפתח:**
${summary.keyMoments.map(m => `- ${m.time} – ${m.tag || 'סמן'}`).join('\n') || '- (טרם סומנו)'}

**אתגרים:**
- ${summary.challenges.join('\n- ')}

**משימות בית:**
- ${summary.homework.join('\n- ')}

**נקודות למעקב:**
- ${summary.followUps.join('\n- ')}
`;

    await safeWriteJSON(path.join(NOTES_DIR, `${base}.json`), summary);
    await fsp.writeFile(path.join(NOTES_DIR, `${base}.md`), md, 'utf8');

    res.json({ ok: true, summary, markdownFile: `${base}.md` });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Fetch summary JSON
app.get('/api/notes/pdf/:base', async (req, res) => {
  const safeBase = (req.params.base || '').replace(/[^a-zA-Z0-9._-]+/g, '');
  try {
    const notesDir = path.join(RECORDINGS_DIR, 'notes');
    const mdPath   = path.join(notesDir, `${safeBase}.md`);
    if (!fs.existsSync(mdPath)) {
      return res.status(404).json({ ok: false, error: 'md not found' });
    }

    const md = fs.readFileSync(mdPath, 'utf8');

    // אם הגדרת PDF_FONT ב-.env ונמצא הקובץ – נטמיע כפונט עברי
    const fontPath = process.env.PDF_FONT || '';
    const hasFont  = fontPath && fs.existsSync(fontPath);
    const b64 = hasFont ? fs.readFileSync(fontPath).toString('base64') : '';
    const fontFace = hasFont
      ? `@font-face { font-family: 'Heb'; src: url(data:font/ttf;base64,${b64}) format('truetype'); }`
      : '';

    // המרת MD → HTML מאוד בסיסית (מותר להחליף למה שיש לך)
    const htmlBody = md
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/^\- (.*)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '<br><br>');

    const html = `<!doctype html><html lang="he" dir="rtl"><head>
<meta charset="utf-8">
<style>
${fontFace}
body { font-family: ${hasFont ? 'Heb' : 'sans-serif'}; line-height:1.45; font-size:14px; }
ul { padding-right:1.2em; }
</style></head><body>${htmlBody}</body></html>`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    await browser.close();

    // 🟢 שליחה בינארית נקייה — לא JSON, לא base64
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(safeBase)}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.end(pdfBuffer);
  } catch (e) {
    console.error('PDF error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Download Markdown
app.get('/notes/:file', (req, res) => {
  const p = path.join(NOTES_DIR, req.params.file);
  if (!fs.existsSync(p)) return res.status(404).end();
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.file}"`);
  fs.createReadStream(p).pipe(res);
});
// ------------------- CBT Notes (dummy placeholders) -------------------


// החזרת סיכום קיים
app.get('/api/notes/:base', async (req, res) => {
  const base = decodeURIComponent(req.params.base);
  const notePath = path.join(NOTES_DIR, `${base}.md`);
  if (!fs.existsSync(notePath)) return res.status(404).json({ ok: false, msg: 'Note not found' });
  const content = await fs.promises.readFile(notePath, 'utf8');
  res.json({ ok: true, text: content });
});

// יצירת סיכום חדש מדומה (לבדיקה)
app.post('/api/summarize', async (req, res) => {
  const { name } = req.body;
  const base = name.replace(/\.[^/.]+$/, '');
  const fakeSummary = `
**מצב רגשי:** שיפור מתון לעומת הפגישה הקודמת  
**מחשבות אוטומטיות:** פחד מטעויות, צורך בשליטה  
**עיוותים קוגניטיביים:** הכל או כלום, ניבוי עתיד  
**מטרות:** אימון נשימות, שיחה פתוחה עם בן הזוג
  `;
  const notePath = path.join(NOTES_DIR, `${base}.md`);
  await fs.promises.writeFile(notePath, fakeSummary, 'utf8');
  res.json({ ok: true, text: fakeSummary });
});

// הורדת קובץ Markdown
app.get('/notes/:file', (req, res) => {
  const file = decodeURIComponent(req.params.file);
  const full = path.join(NOTES_DIR, file);
  if (!fs.existsSync(full)) return res.status(404).send('not found');
  res.download(full);
});

  await installNotes(app, RECORDINGS_DIR);
const CLIENT_DIST = path.join(__dirname, "dashboard", "dist");

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));

  // Fallback for SPA routes
  app.get("*", (req, res, next) => {
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/recordings") ||
      req.path.startsWith("/notes") ||
      req.path === "/__debug/storage"
    ) {
      return next();
    }
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}
app.listen(PORT, () => {
  console.log(`API on http://0.0.0.0:${PORT}`);
});

// ---------- CBT Notes (mock) ----------


// נוודא שיש JSON parser (עבור POST /api/summarize)
app.use?.(express.json({ limit: '2mb' }));

// החזרת סיכום קיים כ-JSON (ה-UI קורא לזה)
app.get('/api/notes/:base', async (req, res) => {
  try {
    const base = decodeURIComponent(req.params.base);
    const p = path.join(NOTES_DIR, `${base}.md`);
    if (!fs.existsSync(p)) return res.status(404).json({ ok: false, error: 'not found' });
    const text = await fsp.readFile(p, 'utf8');
    res.json({ ok: true, text });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// יצירת סיכום דמיוני (לחיצה על "צור סיכום")
app.post('/api/summarize', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, error: 'missing name' });
    const base = name.replace(/\.[^.]+$/, '');
    const md = [
      '**מצב רגשי:** שיפור מתון, ירידה בלחץ הכללי',
      '**מחשבות אוטומטיות:** פחד מטעויות; צורך בשליטה',
      '**עיוותים קוגניטיביים:** הכל או כלום; קריאת מחשבות',
      '**משימות בית:** תרגול נשימות 4-7-8 פעמיים ביום; שיחה קצרה יזומה עם עמית',
    ].join('\n');
    const p = path.join(NOTES_DIR, `${base}.md`);
    await fsp.writeFile(p, md, 'utf8');
    res.json({ ok: true, text: md });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// הורדת ה-Markdown כקובץ
app.get('/notes/:file', (req, res) => {
  const file = decodeURIComponent(req.params.file);
  const p = path.join(NOTES_DIR, file);
  if (!fs.existsSync(p)) return res.status(404).send('not found');
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
  fs.createReadStream(p).pipe(res);
});

// ===== Ensure NOTES dir, JSON + Markdown IO =====

// helper: JSON -> Markdown
function summaryToMarkdown(s) {
  const lines = [];
  lines.push(`**מצב רגשי:** ${s.mood || ''}`);
  if (Array.isArray(s.automaticThoughts) && s.automaticThoughts.length) {
    lines.push(`**מחשבות אוטומטיות:**`);
    for (const t of s.automaticThoughts) lines.push(`- ${t}`);
  }
  if (Array.isArray(s.cognitiveDistortions) && s.cognitiveDistortions.length) {
    lines.push(`**עיוותים קוגניטיביים:**`);
    for (const t of s.cognitiveDistortions) lines.push(`- ${t}`);
  }
  if (Array.isArray(s.homework) && s.homework.length) {
    lines.push(`**משימות בית:**`);
    for (const t of s.homework) lines.push(`- ${t}`);
  }
  if (Array.isArray(s.keyMoments) && s.keyMoments.length) {
    lines.push(`**רגעי מפתח:**`);
    for (const m of s.keyMoments) lines.push(`- ${m.time} — ${m.tag || ''}`);
  }
  return lines.join('\n');
}

// GET summary JSON
app.get('/api/notes/:base', async (req, res) => {
  try {
    const base = path.basename(req.params.base);
    const jsPath = path.join(NOTES_DIR, `${base}.json`);
    if (!fs.existsSync(jsPath)) return res.status(404).json({ ok: false, error: 'not found' });
    const summary = JSON.parse(await fsp.readFile(jsPath, 'utf8'));
    res.json({ ok: true, summary });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST summarize — שומר גם JSON וגם MD
app.post('/api/summarize', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, error: 'missing name' });
    const base = path.basename(name).replace(/\.[^.]+$/, '');

    // דוגמה/מוק: בנה אובייקט סיכום
    const summary = {
      recording: name,
      createdAt: new Date().toISOString(),
      mood: 'מתוח/ה בתחילת הפגישה, רגוע/ה בסופה',
      automaticThoughts: [
        'אם אני לא אצליח – זה אומר שאני כישלון',
        'הם ישפטו אותי אם אתבלבל'
      ],
      cognitiveDistortions: ['הכל או כלום', 'קריאת מחשבות'],
      homework: ['תרגול נשימות 4-7-8 פעמיים ביום', 'שיחה יזומה קצרה עם עמית'],
      keyMoments: []
    };

    // כתיבה ל־JSON
    const jsPath = path.join(NOTES_DIR, `${base}.json`);
    await fsp.writeFile(jsPath, JSON.stringify(summary, null, 2), 'utf8');

    // יצירת Markdown ושמירה
    const md = summaryToMarkdown(summary);
    const mdPath = path.join(NOTES_DIR, `${base}.md`);
    await fsp.writeFile(mdPath, md, 'utf8');

    res.json({ ok: true, summary });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// הורדת ה-Markdown
app.get('/notes/:file', (req, res) => {
  const file = path.basename(req.params.file);
  const p = path.join(NOTES_DIR, file);
  if (!fs.existsSync(p)) return res.status(404).send('not found');
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
  fs.createReadStream(p).pipe(res);
});

// === /api/transcribe ===
// מדמה תמלול וניתוח ראשוני
app.post('/api/transcribe', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, error: 'missing name' });

    // ננקה את הסיומת
    const base = name.replace(/\.[^.]+$/, '');

    // תמלול מדומה
    const transcript = [
      'מטופל: אני מרגיש שאני כל הזמן צריך להיות מושלם.',
      'מטפל: ומה קורה כשאתה לא מרגיש מושלם?',
      'מטופל: אז אני מרגיש שנכשלתי לגמרי...',
      'מטפל: זה נשמע כמו חשיבה של הכל או כלום.'
    ];

    // ניתוח CBT בסיסי
    const summary = {
      recording: name,
      createdAt: new Date().toISOString(),
      mood: 'מתח בתחילת הפגישה, רוגע לקראת הסוף',
      automaticThoughts: [
        'אם אני לא מושלם – אני כישלון',
        'אני צריך לרצות את כולם'
      ],
      cognitiveDistortions: ['הכל או כלום', 'הכללה יתרה'],
      insights: ['הבין שהצורך בשלמות פוגע בשלווה שלו'],
      homework: ['תרגול קבלה עצמית כל ערב', 'לרשום 3 דברים טובים על עצמו ביום'],
      transcript
    };


    const jsPath = path.join(NOTES_DIR, `${base}.json`);
    const mdPath = path.join(NOTES_DIR, `${base}.md`);

    await fs.promises.writeFile(jsPath, JSON.stringify(summary, null, 2), 'utf8');

    // שמירה ל-Markdown
    const mdLines = [
      `**מצב רגשי:** ${summary.mood}`,
      `**מחשבות אוטומטיות:**`,
      ...summary.automaticThoughts.map(t => `- ${t}`),
      `**עיוותים קוגניטיביים:**`,
      ...summary.cognitiveDistortions.map(t => `- ${t}`),
      `**תובנות:**`,
      ...summary.insights.map(t => `- ${t}`),
      `**משימות בית:**`,
      ...summary.homework.map(t => `- ${t}`),
      '',
      '**תמלול:**',
      ...summary.transcript.map(l => `> ${l}`)
    ];
    await fs.promises.writeFile(mdPath, mdLines.join('\n'), 'utf8');

    res.json({ ok: true, summary });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---------- PDF export from Markdown (RTL + Hebrew font) ----------

app.get('/api/notes/:base.pdf', async (req, res) => {
  console.log('📄 PDF route base =', req.params.base);
  try {
    const base = req.params.base;
    const notesDir = path.join(RECORDINGS_DIR, 'notes');
    const mdPath = path.join(notesDir, `${base}.md`);
    if (!fs.existsSync(mdPath)) {
      return res.status(404).json({ ok: false, error: 'not found' });
    }

    // 1) Markdown -> HTML
    const md = fs.readFileSync(mdPath, 'utf8');
    const htmlBody = marked.parse(md);

    // 2) הטמעת גופן עברי (אם מוגדר ב-PDF_FONT)
    let fontFace = '';
    try {
      const fontPath = process.env.PDF_FONT;
      if (fontPath && fs.existsSync(fontPath)) {
        const fontData = fs.readFileSync(fontPath);
        const b64 = fontData.toString('base64');
        fontFace = `
          @font-face {
            font-family: "NotoHeb";
            src: url(data:font/ttf;base64,${b64}) format("truetype");
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
          body { font-family: "NotoHeb", system-ui, sans-serif; }
        `;
      }
    } catch (_) {}

    // 3) HTML עוטף (RTL, יישור לימין, בולטים, מרווחים)
    const html = `
      <!doctype html>
      <html lang="he" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <style>
          ${fontFace}
          html, body { margin: 0; padding: 0; }
          body { direction: rtl; font-size: 14px; line-height: 1.6; color: #111; padding: 28px; }
          h1, h2, h3, h4 { margin: 0 0 10px; }
          h1 { font-size: 22px; }
          h2 { font-size: 18px; }
          h3 { font-size: 16px; }
          p { margin: 0 0 8px; }
          ul { margin: 0 0 10px; padding-right: 20px; }
          li { margin: 0 0 4px; }
          blockquote {
            border-right: 3px solid #ddd; padding-right: 10px; margin: 8px 0; color: #333;
          }
          .title { font-size: 22px; font-weight: 700; margin-bottom: 12px; }
          .meta { color:#555; font-size: 12px; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="title">כתב אחרי</div>
        <div class="meta">${base}</div>
        ${htmlBody}
      </body>
      </html>
    `;

    // 4) יצירת PDF עם Puppeteer (Chromium)
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--font-render-hinting=none']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${base}.pdf"`);
    res.send(pdf);

  } catch (e) {
    console.error('PDF error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});
// ---------- /PDF export ----------

// --- Dedicated PDF route to avoid route-order conflicts ---
app.get('/api/notes/pdf/:base', async (req, res) => {
  try {
    const base = req.params.base;
    console.log('📄 PDF route (dedicated) base =', base);

    const notesDir = path.join(RECORDINGS_DIR, 'notes');
    const mdPath   = path.join(notesDir, `${base}.md`);
    if (!fs.existsSync(mdPath)) {
      return res.status(404).json({ ok: false, error: 'not found' });
    }

    const md      = fs.readFileSync(mdPath, 'utf8');
    const htmlMD  = marked.parse(md);

    // embed Hebrew font if provided
    let fontFace = '';
    try {
      const fontPath = process.env.PDF_FONT;
      if (fontPath && fs.existsSync(fontPath)) {
        const b64 = fs.readFileSync(fontPath).toString('base64');
        fontFace = `
          @font-face {
            font-family: "NotoHeb";
            src: url(data:font/ttf;base64,${b64}) format("truetype");
            font-weight: normal; font-style: normal; font-display: swap;
          }
          body { font-family: "NotoHeb", system-ui, sans-serif; }
        `;
      }
    } catch {}

    const html = `
      <!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8" />
      <style>
        ${fontFace}
        html,body { margin:0; padding:0 }
        body { direction:rtl; font-size:14px; line-height:1.6; color:#111; padding:28px }
        h1{font-size:22px} h2{font-size:18px} h3{font-size:16px}
        p{margin:0 0 8px} ul{margin:0 0 10px; padding-right:20px} li{margin:0 0 4px}
        blockquote{border-right:3px solid #ddd; padding-right:10px; margin:8px 0; color:#333}
      </style></head><body>
        <div style="font-weight:700;font-size:22px;margin:0 0 10px">כתב אחרי</div>
        <div style="color:#555;font-size:12px;margin:0 0 16px">${base}</div>
        ${htmlMD}
      </body></html>`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page    = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf     = await page.pdf({
      format: 'A4', printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
    });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${base}.pdf"`);
    res.send(pdf);
  } catch (e) {
    console.error('PDF error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});
// --- /Dedicated PDF route ---

// --- YRD: storage dirs ---

// בריאות ל־Railway/מוניטור
app.get('/healthz', (req, res) => res.json({ ok: true }));

// PATCH /api/recordings/:name  body: { newName: "session-abc.webm" }
app.patch('/api/recordings/:name', async (req, res) => {
  try {
    const oldFull = (req.params?.name || '').trim();
    const newFull = (req.body?.newName || '').trim();
    if (!oldFull || !newFull) return res.status(400).json({ error: 'missing name(s)' });

    const oldBase = oldFull.replace(/\.webm$/i, '');
    const newBase = newFull.replace(/\.webm$/i, '');
    const oldWebm = path.join(RECORDINGS_DIR, `${oldBase}.webm`);
    const newWebm = path.join(RECORDINGS_DIR, `${newBase}.webm`);

    console.log('[rename] from:', oldWebm, 'to:', newWebm);

    // בדוק שהמקור קיים
    await fsp.access(oldWebm).catch(() => { 
      return res.status(404).json({ error: 'source not found', path: oldWebm });
    });

    // ודא שהיעד לא קיים
    try { await fsp.access(newWebm); return res.status(409).json({ error: 'target exists', path: newWebm }); } catch {}

    // שינוי שם לקובץ ההקלטה
    await fsp.rename(oldWebm, newWebm);

    // שינוי שם גם לקובצי הסיכום (אם קיימים)
    for (const ext of ['json','md']) {
      const src = path.join(NOTES_DIR, `${oldBase}.${ext}`);
      const dst = path.join(NOTES_DIR, `${newBase}.${ext}`);
      try { await fsp.rename(src, dst); } catch (e) { console.warn('[rename note]', ext, String(e)); }
    }

    res.json({ ok: true, old: oldBase, new: newBase });
  } catch (e) {
    console.error('[rename] error:', e);
    res.status(500).json({ error: 'rename failed', details: String(e) });
  }
});

// DEBUG — להסיר בפרודקשן
app.get('/__debug/storage', async (_req, res) => {
  try {
    const out = { RECORDINGS_DIR, NOTES_DIR, recordings: [], notes: [] };
    try { out.recordings = await fsp.readdir(RECORDINGS_DIR); } catch (e) { out.recErr = String(e); }
    try { out.notes = await fsp.readdir(NOTES_DIR); } catch (e) { out.notesErr = String(e); }
    res.set('Cache-Control', 'no-store');
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
