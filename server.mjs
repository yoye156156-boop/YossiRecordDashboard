import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())

// תיקיית הקלטות
const recordingsDir = path.join(__dirname, 'recordings')
if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true })

// סטטי לקבצים
app.use('/recordings', express.static(recordingsDir))

// Multer להעלאה
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, recordingsDir),
  filename: (_req, file, cb) => cb(null, file.originalname)
})
const upload = multer({ storage })

// בדיקה
app.get('/api/runYossi', (_req, res) => res.json({ ok: true, msg: 'שלום יוסי! API פעיל.' }))

// רשימה
app.get('/api/recordings', (_req, res) => {
  const files = (fs.existsSync(recordingsDir) ? fs.readdirSync(recordingsDir) : [])
    .filter(f => fs.statSync(path.join(recordingsDir, f)).isFile())
    .map(f => {
      const s = fs.statSync(path.join(recordingsDir, f))
      return {
        name: f,
        size: `${(s.size / 1024).toFixed(1)} KB`,
        date: new Date(s.mtime).toLocaleString('he-IL')
      }
    }).sort((a,b)=> a.name.localeCompare(b.name, 'he'))
  res.json(files)
})

// העלאה (שדה: file)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok:false, error:'missing file' })
  return res.json({ ok: true, file: { name: req.file.originalname } })
})

// מחיקה
app.delete('/api/recordings/:name', (req, res) => {
  try {
    const safeName = path.basename(decodeURIComponent(req.params.name))
    const fp = path.join(recordingsDir, safeName)
    if (!fs.existsSync(fp)) return res.status(404).json({ ok:false, error:'not found' })
    fs.unlink(fp, err => {
      if (err) return res.status(500).json({ ok:false, error:'unlink failed' })
      return res.json({ ok:true })
    })
  } catch (e) {
    return res.status(400).json({ ok:false, error:'bad name' })
  }
})

const PORT = 3001
app.listen(PORT, () => console.log(`✅ API running on http://localhost:${PORT}`))
