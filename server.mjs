import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import multer from "multer";
import fs from "fs";
import path from "path";
import mime from "mime-types";
import { fileURLToPath } from "url";

dotenv.config();

// __dirname ב-ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// אפליקציה
const app = express();

// CORS + JSON + לוגים
app.use(cors({ origin: true }));
app.options("*", cors({ origin: true }));
app.use(express.json());
app.use(morgan("dev"));

// נתיב תיקיית ההקלטות
const ROOT = __dirname;
const RECORDINGS_DIR = process.env.RECORDINGS_DIR || path.join(ROOT, "recordings");

// וידוא התיקיה וקובץ בדיקה
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  fs.writeFileSync(path.join(RECORDINGS_DIR, "_volume_check.txt"), "ok");
  console.log("✅ Volume check: created recordings/_volume_check.txt");
}

// עזר
const fsp = fs.promises;
const ALLOWED_EXTS = new Set([".webm", ".weba", ".ogg", ".wav", ".mp3", ".txt"]);
const detectMime = (ext) =>
  ({
    ".webm": "audio/webm",
    ".weba": "audio/webm",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".txt": "text/plain",
  }[ext] || "application/octet-stream");

const isSafeName = (name) => {
  if (!name || typeof name !== "string") return false;
  if (name.includes("..") || name.includes("/") || name.includes("\\")) return false;
  if (name.trim() === "") return false;
  return true;
};

// --- בריאות ---
app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// --- רשימת ההקלטות (החזרה היא מערך – תאימות לפרונט) ---
app.get("/api/recordings", async (_req, res) => {
  try {
    const files = await fsp.readdir(RECORDINGS_DIR);
    const rows = [];
    for (const name of files) {
      const full = path.join(RECORDINGS_DIR, name);
      const st = await fsp.stat(full).catch(() => null);
      if (!st || !st.isFile()) continue;
      const ext = path.extname(name).toLowerCase();
      rows.push({
        name,
        sizeKB: Math.round(st.size / 1024),
        ext,
        mime: detectMime(ext),
        createdAt: new Date(st.mtime).toISOString().slice(0, 16).replace("T", " "), // תואם למה שראית
        mtime: st.mtimeMs,
      });
    }
    rows.sort((a, b) => b.mtime - a.mtime);
    res.json({ ok: true, items: rows });
  } catch (e) {
    console.error("LIST_FAILED", e);
    res.status(500).json({ ok: false, error: "LIST_FAILED" });
  }
});

// --- הזרמת קובץ / טווחים (Range) ---
app.get("/recordings/:name", async (req, res) => {
  try {
    const { name } = req.params;
    if (!isSafeName(name)) return res.status(400).end();
    const full = path.join(RECORDINGS_DIR, name);
    if (!fs.existsSync(full)) return res.status(404).end();

    const stat = await fsp.stat(full);
    const fileSize = stat.size;
    const ext = path.extname(name).toLowerCase();
    const contentType =
      mime.lookup(name) || detectMime(ext) || "application/octet-stream";

    // תמיכה ב-Range: bytes=...
    const range = req.headers.range;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (m) {
        let start = m[1] ? parseInt(m[1], 10) : 0;
        let end = m[2] ? parseInt(m[2], 10) : fileSize - 1;
        if (isNaN(start) || isNaN(end) || start > end || end >= fileSize) {
          start = 0;
          end = Math.max(0, fileSize - 1);
        }
        const chunkSize = end - start + 1;
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": contentType,
          "Cache-Control": "no-store",
        });
        fs.createReadStream(full, { start, end }).pipe(res);
        return;
      }
    }

    // ללא Range – 200 מלא
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(full).pipe(res);
  } catch (e) {
    console.error("STREAM_FAILED", e);
    res.status(500).end();
  }
});

// --- מחיקה ---
app.delete("/api/recordings/:name", async (req, res) => {
  try {
    const { name } = req.params;
    if (!isSafeName(name))
      return res.status(400).json({ ok: false, error: "BAD_NAME" });
    const full = path.join(RECORDINGS_DIR, name);
    if (!fs.existsSync(full))
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    await fsp.rm(full);
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE_FAILED", e);
    res.status(500).json({ ok: false, error: "DELETE_FAILED" });
  }
});

// --- העלאה ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, RECORDINGS_DIR),
  filename: (_req, file, cb) =>
    cb(null, file.originalname || `upload-${Date.now()}`),
});
const upload = multer({ storage });

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "NO_FILE" });
  return res.json({ ok: true, name: req.file.filename });
});

// --- שינוי שם (PUT /api/recordings/:name) ---
app.put("/api/recordings/:name", express.json(), (req, res) => {
  try {
    const oldName = req.params.name || "";
    const { newName: rawNewName } = req.body || {};

    if (!oldName || !rawNewName) {
      return res.status(400).json({ ok: false, error: "MISSING_NAME" });
    }

    // ננקה רווחים ונבדוק סלאשים
    const newName = rawNewName.trim();
    if (newName.includes("..") || /[\/\\]/.test(newName)) {
      return res.status(400).json({ ok: false, error: "BAD_NAME" });
    }

    const oldExt = path.extname(oldName);
    let finalName = newName;

    // אם שכחת סיומת – נוסיף אותה אוטומטית
    if (!path.extname(newName)) {
      finalName = newName + oldExt;
    }

    // אם יש סיומת כפולה – נתקן
    if (finalName.endsWith(oldExt + oldExt)) {
      finalName = finalName.slice(0, -oldExt.length);
    }

    const oldPath = path.join(RECORDINGS_DIR, oldName);
    const newPath = path.join(RECORDINGS_DIR, finalName);

    if (!fs.existsSync(oldPath)) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    fs.renameSync(oldPath, newPath);
    res.json({ ok: true, oldName, newName: finalName });
  } catch (err) {
    console.error("❌ Rename error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// האזנה
const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

// --- rename (PUT /api/recordings/:name) ---

app.put('/api/recordings/:name', express.json(), async (req, res) => {
  try {
    const oldName = req.params.name || "";
    const { newName } = req.body || {};
    if (!oldName || !newName) {
      return res.status(400).json({ ok:false, error:'MISSING_NAME' });
    }
    // היגיינה
    if (oldName.includes('..') || newName.includes('..') || /[\/\\]/.test(newName)) {
      return res.status(400).json({ ok:false, error:'BAD_NAME' });
    }

    const RECORDINGS_DIR = process.env.RECORDINGS_DIR || path.join(process.cwd(), 'recordings');
    const from = path.join(RECORDINGS_DIR, oldName);
    const to   = path.join(RECORDINGS_DIR, newName);

    if (!fs.existsSync(from)) return res.status(404).json({ ok:false, error:'NOT_FOUND' });
    if (fs.existsSync(to))   return res.status(409).json({ ok:false, error:'ALREADY_EXISTS' });

    await fsp.rename(from, to);
    return res.json({ ok:true, oldName, newName });
  } catch (e) {
    console.error('RENAME_FAILED', e);
    return res.status(500).json({ ok:false, error:'RENAME_FAILED' });
  }
});
