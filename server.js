require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const multer = require("multer");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const ROOT = __dirname;
const RECORDINGS_DIR = path.join(ROOT, "recordings");

if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  fs.writeFileSync(path.join(RECORDINGS_DIR, "_volume_check.txt"), "ok");
  console.log("✅ Volume check: created recordings/_volume_check.txt");
}

const ALLOWED_EXTS = new Set([
  ".webm",
  ".weba",
  ".ogg",
  ".wav",
  ".mp3",
  ".txt",
]);
const detectMime = (ext) =>
  ({
    ".webm": "audio/webm",
    ".weba": "audio/webm",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".txt": "text/plain",
  })[ext] || "application/octet-stream";

const isSafeName = (name) => {
  if (!name || typeof name !== "string") return false;
  if (name.includes("..") || name.includes("/") || name.includes("\\"))
    return false;
  if (name.trim() === "") return false;
  return true;
};

// -------- list recordings (with mtime) ----------
app.get("/api/recordings", async (_req, res) => {
  try {
    const files = await fsp.readdir(RECORDINGS_DIR);
    const rows = [];
    for (const name of files) {
      const full = path.join(RECORDINGS_DIR, name);
      const st = await fsp.stat(full);
      if (!st.isFile()) continue;
      const ext = path.extname(name).toLowerCase();
      rows.push({
        name,
        sizeKB: Math.round(st.size / 1024),
        ext,
        mime: detectMime(ext),
        mtime: st.mtimeMs, // מספר מ״ש
        mtimeISO: st.mtime.toISOString(), // ISO מלא
      });
    }
    // ממיינים מהחדש לישן
    rows.sort((a, b) => b.mtime - a.mtime);
    res.json({ ok: true, items: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "LIST_FAILED" });
  }
});

// -------- stream single file ----------
app.get("/recordings/:name", async (req, res) => {
  try {
    const { name } = req.params;
    if (!isSafeName(name)) return res.status(400).end();
    const full = path.join(RECORDINGS_DIR, name);
    if (!fs.existsSync(full)) return res.status(404).end();
    res.sendFile(full);
  } catch {
    res.status(500).end();
  }
});

// -------- delete ----------
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
    console.error(e);
    res.status(500).json({ ok: false, error: "DELETE_FAILED" });
  }
});

// -------- upload ----------
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

// -------- rename ----------
app.post("/api/rename", async (req, res) => {
  try {
    const { oldName, newName } = req.body || {};
    if (!isSafeName(oldName) || !isSafeName(newName)) {
      return res.status(400).json({ ok: false, error: "BAD_NAME" });
    }
    const oldExt = path.extname(oldName).toLowerCase();
    const newExt = path.extname(newName).toLowerCase();
    if (!ALLOWED_EXTS.has(oldExt) || !ALLOWED_EXTS.has(newExt)) {
      return res.status(400).json({ ok: false, error: "BAD_EXT" });
    }
    const oldFull = path.join(RECORDINGS_DIR, oldName);
    const newFull = path.join(RECORDINGS_DIR, newName);
    if (!fs.existsSync(oldFull))
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (fs.existsSync(newFull))
      return res.status(409).json({ ok: false, error: "ALREADY_EXISTS" });
    await fsp.rename(oldFull, newFull);
    res.json({ ok: true, name: newName });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "RENAME_FAILED" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
// PUT /api/recordings/:oldName  { newName }
app.put('/api/recordings/:oldName', (req, res) => {
  const oldName = req.params.oldName;
  const { newName } = req.body || {};
  if (!oldName || !newName) return res.status(400).json({ ok: false, error: 'missing names' });

  const oldPath = path.join(RECORDINGS_DIR, oldName);
  const newPath = path.join(RECORDINGS_DIR, newName);

  if (!fs.existsSync(oldPath)) return res.status(404).json({ ok: false, error: 'not found' });
  if (fs.existsSync(newPath)) return res.status(409).json({ ok: false, error: 'exists' });

  try {
    fs.renameSync(oldPath, newPath);
    return res.json({ ok: true, name: newName });
  } catch (e) {
    console.error('rename error', e);
    return res.status(500).json({ ok: false, error: 'rename failed' });
  }
});
