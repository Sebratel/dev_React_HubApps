const router      = require('express').Router()
const multer      = require('multer')
const path        = require('path')
const fs          = require('fs')
const { randomUUID } = require('crypto')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'highlights')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
    cb(null, `${Date.now()}_${randomUUID().slice(0, 8)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true)
    cb(new Error('Apenas imagens são permitidas'))
  },
})

// POST /upload/highlights — admin only
router.post('/highlights', requireAuth, requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' })
  res.json({ path: `/uploads/highlights/${req.file.filename}` })
})

module.exports = router
