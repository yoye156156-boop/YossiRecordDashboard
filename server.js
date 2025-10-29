import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import multer from "multer";
import mime from "mime";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const DEFAULT_DIR = path.join(process.cwd(), "recordings");
const RECORDINGS_DIR = process.env.RECORDINGS_DIR || DEFAULT_DIR;

// וידוא תיקיית יעד
if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR, { recursive: true });

app.use(express.json());

// אם תפרוס לקליינט נפרד—שאיר CORS. אם הכל מאותו דומיין, אפשר לכבות.
app.use(cors());

// ===== Static for direct open =====
app.use("/recordings", express.static(RECORDINGS_DIR));

// ===== List =====
app.get("/api/recordings", (req, res) => {
  try {
    const files = fs.readdirSync(RECORDINGS_DIR, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => {
        const fp = path.join(RECORDINGS_DIR, d.name);
        const st = fs.statSync(fp);
        return { name: d.name, size: st.size, mtimeMs: st.mtimeMs };
      });
    res.json(files);
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to read recordings" }); }
});

// ===== Download =====
app.get("/api/download/:name", (req, res) => {
  const safe = path.basename(req.params.name);
  const fp = path.join(RECORDINGS_DIR, safe);
  if (fs.existsSync(fp) && fs.statSync(fp).isFile()) return res.download(fp, safe);
  res.status(404).json({ error: "File not found" });
});

// ===== Delete =====
app.delete("/api/recordings/:name", (req, res) => {
  const safe = path.basename(req.params.name);
  const fp = path.join(RECORDINGS_DIR, safe);
  try {
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      fs.rmSync(fp, { force: false });
      return res.json({ ok: true });
    }
    res.status(404).json({ error: "File not found" });
  } catch (e) { console.error(e); res.status(500).json({ error: e.code || "Delete failed" }); }
});

// ===== Upload (with multer) =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RECORDINGS_DIR),
  filename: (req, file, cb) => {
    const ext = mime.getExtension(file.mimetype) || (path.extname(file.originalname).slice(1) || "bin");
    const base = path.basename(file.originalname, path.extname(file.originalname));
    cb(null, `${base}${path.extname(file.originalname) || "." + ext}`);
  },
});
const upload = multer({
  storage,
  // (רשות) הגבלת MIME רק לאודיו/וידאו:
  fileFilter: (req, file, cb) => {
    if (/^audio\/|^video\//.test(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type (only audio/video)"));
  },
});
app.post("/api/upload", upload.single("file"), (req, res) => {
  res.json({ ok: true, name: req.file.filename });
});

// ===== Serve React build in production =====
const clientDist = path.join(process.cwd(), "dashboard", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("/", (req, res) => res.sendFile(path.join(clientDist, "index.html")));
  // למקרה של SPA ראוטים:
  app.get(/^(?!\/api\/|\/recordings\/).+/, (req, res) =>
    res.sendFile(path.join(clientDist, "index.html"))
  );
}

app.listen(PORT, () => {
  console.log(`Server on ${PORT}`);
  console.log("RECORDINGS_DIR =", RECORDINGS_DIR);
  console.log("Client dist exists?", fs.existsSync(clientDist));
});
