const router      = require('express').Router()
const multer      = require('multer')
const path        = require('path')
const fs          = require('fs')
const { randomUUID } = require('crypto')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'highlights')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

// Extensões e MIME types de imagem aceitos (whitelist)
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const ALLOWED_EXT  = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp'])

// Valida magic bytes do arquivo para garantir que o conteúdo é realmente uma imagem
function detectImageMime(buf) {
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png'
  if (buf.slice(0, 4).toString('ascii') === 'GIF8') return 'image/gif'
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  return null
}

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    // Usa extensão derivada do MIME real (não do nome original)
    const mimeToExt = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' }
    const ext = mimeToExt[file.mimetype] || '.jpg'
    cb(null, `${Date.now()}_${randomUUID().slice(0, 8)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    // 1ª barreira: MIME type do Content-Type header
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Apenas imagens são permitidas (JPEG, PNG, GIF, WebP)'))
    }
    // 2ª barreira: extensão do nome original
    const ext = path.extname(file.originalname).toLowerCase()
    if (!ALLOWED_EXT.has(ext)) {
      return cb(new Error('Extensão de arquivo não permitida'))
    }
    cb(null, true)
  },
})

// POST /upload/highlights — admin only
router.post('/highlights', requireAuth, requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' })

  // 3ª barreira: magic bytes — valida o conteúdo real do arquivo
  const buf = fs.readFileSync(req.file.path)
  const realMime = detectImageMime(buf)
  if (!realMime) {
    fs.unlinkSync(req.file.path) // remove arquivo inválido do disco
    return res.status(400).json({ error: 'Conteúdo do arquivo não é uma imagem válida' })
  }

  res.json({ path: `/uploads/highlights/${req.file.filename}` })
})

module.exports = router
