import express from "express";
import cors from "cors";
import fs from "fs";
// בדיקה שה-volume מחובר וניתן לכתיבה
try {
  const testPath = process.env.RECORDINGS_DIR || "/data/recordings";
  fs.mkdirSync(testPath, { recursive: true });
  const testFile = `${testPath}/_volume_check.txt`;
  fs.writeFileSync(testFile, "✅ Volume is writable " + new Date().toISOString());
  console.log("✅ Volume check: created test file at", testFile);
} catch (err) {
  console.error("❌ Volume check failed:", err.message);
}
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const DEFAULT_DIR = path.join(process.cwd(), "recordings");
const RECORDINGS_DIR = process.env.RECORDINGS_DIR || DEFAULT_DIR;

app.use(cors());
app.use(express.json());
app.use("/recordings", express.static(RECORDINGS_DIR));

app.get("/api/recordings", (req, res) => {
  try {
    const files = fs.readdirSync(RECORDINGS_DIR)
      .filter(f => fs.statSync(path.join(RECORDINGS_DIR, f)).isFile())
      .map(f => {
        const st = fs.statSync(path.join(RECORDINGS_DIR, f));
        return { name: f, size: st.size, mtimeMs: st.mtimeMs };
      });
    res.json(files);
  } catch (e) { console.error(e); res.status(500).json({ error: "Failed to read recordings" }); }
});

app.get("/api/download/:name", (req, res) => {
  const safe = path.basename(req.params.name);
  const fp = path.join(RECORDINGS_DIR, safe);
  if (fs.existsSync(fp)) return res.download(fp, safe);
  res.status(404).json({ error: "File not found" });
});

app.delete("/api/recordings/:name", (req, res) => {
  const safe = path.basename(req.params.name);
  const fp = path.join(RECORDINGS_DIR, safe);
  try {
    console.log("DELETE", fp);
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      fs.unlinkSync(fp);
      console.log("OK deleted:", safe);
      return res.json({ ok: true });
    }
    res.status(404).json({ error: "File not found" });
  } catch (e) {
    console.error("DELETE error:", e.code, e.message);
    res.status(500).json({ error: e.code || "Delete failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server on ${PORT}`);
  console.log("RECORDINGS_DIR =", RECORDINGS_DIR);
});
