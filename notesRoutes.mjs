import fs from 'fs';
import path from 'path';
import { promises as fsp } from 'fs';

// ממיר אובייקט סיכום ל-Markdown
function summaryToMarkdown(s) {
  const lines = [];
  lines.push(`**מצב רגשי:** ${s.mood || ''}`);
  if (Array.isArray(s.automaticThoughts) && s.automaticThoughts.length) {
    lines.push('**מחשבות אוטומטיות:**'); for (const t of s.automaticThoughts) lines.push(`- ${t}`);
  }
  if (Array.isArray(s.cognitiveDistortions) && s.cognitiveDistortions.length) {
    lines.push('**עיוותים קוגניטיביים:**'); for (const t of s.cognitiveDistortions) lines.push(`- ${t}`);
  }
  if (Array.isArray(s.homework) && s.homework.length) {
    lines.push('**משימות בית:**'); for (const t of s.homework) lines.push(`- ${t}`);
  }
  if (Array.isArray(s.keyMoments) && s.keyMoments.length) {
    lines.push('**רגעי מפתח:**'); for (const m of s.keyMoments) lines.push(`- ${m.time} — ${m.tag || ''}`);
  }
  return lines.join('\n');
}

// מתקין את נתיבי ה-Notes על האפליקציה הקיימת בלי לגעת ביתרות
export async function installNotes(app, RECORDINGS_DIR) {
  const NOTES_DIR = path.join(RECORDINGS_DIR, 'notes');
  if (!fs.existsSync(NOTES_DIR)) { await fsp.mkdir(NOTES_DIR, { recursive: true }); }

  // חשוב: JSON parser פעם אחת בלבד – ננסה להשתמש אם כבר הוגדר, ואם לא נריץ כאן
  if (!app._jsonEnabled) {
    app.use?.(app.json?.() || ((await import('express')).default.json()));
    app._jsonEnabled = true;
  }

  // GET /api/notes/:base  → מחזיר JSON של הסיכום
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

  // POST /api/summarize  → יוצר גם JSON וגם MD (Mock)
  app.post('/api/summarize', async (req, res) => {
    try {
      const { name } = req.body || {};
      if (!name) return res.status(400).json({ ok: false, error: 'missing name' });
      const base = path.basename(name).replace(/\.[^.]+$/, '');

      // סיכום דמיוני – מתאים ל-MVP
      const summary = {
        recording: name,
        createdAt: new Date().toISOString(),
        mood: 'מתוח/ה בתחילת הפגישה, רגוע/ה בסופה',
        automaticThoughts: ['אם אני לא אצליח – זה אומר שאני כישלון', 'הם ישפטו אותי אם אתבלבל'],
        cognitiveDistortions: ['הכל או כלום', 'קריאת מחשבות'],
        homework: ['תרגול נשימות 4-7-8 פעמיים ביום', 'שיחה קצרה יזומה עם עמית'],
        keyMoments: []
      };

      const jsPath = path.join(NOTES_DIR, `${base}.json`);
      await fsp.writeFile(jsPath, JSON.stringify(summary, null, 2), 'utf8');

      const mdPath = path.join(NOTES_DIR, `${base}.md`);
      await fsp.writeFile(mdPath, summaryToMarkdown(summary), 'utf8');

      res.json({ ok: true, summary });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /notes/:file  → הורדת Markdown
  app.get('/notes/:file', (req, res) => {
    const file = path.basename(req.params.file);
    const p = path.join(NOTES_DIR, file);
    if (!fs.existsSync(p)) return res.status(404).send('not found');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
    fs.createReadStream(p).pipe(res);
  });
}
