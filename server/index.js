import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import cors from "cors";
import morgan from "morgan";

const app = express();
app.use(cors());
app.use(morgan("dev"));

const RECORDINGS_DIR = path.join(process.cwd(), "recordings");
if (!fs.existsSync(RECORDINGS_DIR))
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, RECORDINGS_DIR),
  filename: (_, file, cb) =>
    cb(null, file.originalname || `rec-${Date.now()}.ogg`), // ברירת מחדל .ogg
});
const upload = multer({ storage });

/** זיהוי סוג קובץ לפי חתימת bytes ראשונים */
function sniffMime(fp) {
  try {
    const fd = fs.openSync(fp, "r");
    const buf = Buffer.alloc(12);
    const n = fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    if (n >= 4) {
      // OGG: "OggS"
      if (buf.slice(0, 4).toString() === "OggS") return "audio/ogg";
      // WAV: "RIFF" ... "WAVE"
      if (
        buf.slice(0, 4).toString() === "RIFF" &&
        buf.slice(8, 12).toString() === "WAVE"
      )
        return "audio/wav";
      // WebM/Matroska: 0x1A45DFA3
      if (
        buf[0] === 0x1a &&
        buf[1] === 0x45 &&
        buf[2] === 0xdf &&
        buf[3] === 0xa3
      )
        return "audio/webm";
    }
  } catch {}
  // fallback לפי סיומת
  const ext = path.extname(fp).toLowerCase();
  if (ext === ".ogg") return "audio/ogg";
  if (ext === ".wav") return "audio/wav";
  return "audio/webm";
}

app.get("/api/recordings", (_, res) => {
  const files = fs
    .readdirSync(RECORDINGS_DIR)
    .filter((f) => fs.statSync(path.join(RECORDINGS_DIR, f)).isFile())
    .map((name) => {
      const st = fs.statSync(path.join(RECORDINGS_DIR, name));
      return {
        name,
        sizeKB: Math.round(st.size / 1024),
        createdAt: new Date(st.mtime)
          .toISOString()
          .replace("T", " ")
          .slice(0, 16),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(files);
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no file" });
  console.log("UPLOAD:", {
    name: req.file.originalname,
    size: req.file.size,
    mime: req.file.mimetype,
    path: req.file.path,
  });
  res.json({ ok: true, file: req.file.filename, size: req.file.size });
});

app.delete("/api/recordings/:name", (req, res) => {
  const filePath = path.join(RECORDINGS_DIR, req.params.name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: "not found" });
  }
});

// 🎧 סטרימינג עם Range (206) + MIME מזוהה אוטומטית
app.get("/recordings/:name", (req, res) => {
  const filePath = path.join(RECORDINGS_DIR, req.params.name);
  if (!fs.existsSync(filePath)) return res.status(404).send("Not found");

  const stat = fs.statSync(filePath);
  const total = stat.size;
  const range = req.headers.range;
  const forceDownload = "download" in req.query;

  // אם הקובץ ריק — עדיף להחזיר 204 כדי שלא "יקפא" הנגן
  if (!total) {
    return res.status(204).end();
  }

  let mime = forceDownload ? "application/octet-stream" : sniffMime(filePath);

  if (forceDownload) {
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${path.basename(filePath)}"`,
    );
  }

  if (range) {
    const m = range.match(/bytes=(\d*)-(\d*)/);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : total - 1;

    if (isNaN(start) || start < 0) start = 0;
    if (isNaN(end) || end >= total) end = total - 1;
    if (start > end) start = 0;

    const chunk = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunk,
      "Content-Type": mime,
      "Cache-Control": "no-store",
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": total,
      "Content-Type": mime,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(
    `✅ API running at http://localhost:${PORT}  DIR: ${RECORDINGS_DIR}`,
  ),
);
