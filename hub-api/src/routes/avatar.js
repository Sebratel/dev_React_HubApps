/**
 * /avatar — geração de avatar com IA
 *
 * POST /avatar/generate  → gera 4 variações via Pollinations.ai (FLUX, gratuito)
 * POST /avatar/save      → salva a imagem escolhida como photo_url do usuário
 */

const router   = require('express').Router()
const fs       = require('fs')
const path     = require('path')
const https    = require('https')
const { randomUUID } = require('crypto')
const pool     = require('../db/pool')
const { requireAuth } = require('../middleware/auth')
const { avatarSaveLimiter } = require('../middleware/rateLimits')

function detectImageMime(buf) {
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png'
  if (buf.slice(0, 4).toString('ascii') === 'GIF8') return 'image/gif'
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  return null
}

// ─── Diretório de avatares gerados ────────────────────────────────────────────

const AVATAR_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'avatars')
fs.mkdirSync(AVATAR_DIR, { recursive: true })

// ─── Prompts por estilo ───────────────────────────────────────────────────────

const STYLE_PROMPTS = {
  cartoon:      'flat cartoon illustration style, bold outlines, vibrant colors, friendly look',
  illustrated:  'detailed hand-drawn illustration style, artistic, warm tones',
  anime:        'anime / manga style, big expressive eyes, cel shading, clean linework',
  professional: 'clean professional portrait style, minimal background, business-appropriate',
  pixel:        'pixel art style, 16-bit retro game character sprite, colorful',
  watercolor:   'soft watercolor painting style, pastel tones, artistic brush strokes',
}

// ─── Helper: busca imagem via URL (segue redirecionamentos) ──────────────────

function fetchImageBuffer(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft <= 0) return reject(new Error('Muitos redirecionamentos'))
    https.get(url, { timeout: 30_000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchImageBuffer(res.headers.location, redirectsLeft - 1)
          .then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end',  ()  => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

// ─── POST /avatar/generate ────────────────────────────────────────────────────
// Usa Pollinations.ai (FLUX) — gratuito, sem chave de API

router.post('/generate', requireAuth, async (req, res, next) => {
  try {
    const { style = 'cartoon', prompt = '' } = req.body

    const styleDesc = STYLE_PROMPTS[style] || STYLE_PROMPTS.cartoon
    const userDesc  = prompt?.trim() ? `, ${prompt.trim()}` : ''

    const basePrompt =
      `profile avatar portrait, ${styleDesc}${userDesc}, ` +
      `shoulders up, centered face, clean simple background, ` +
      `professional and friendly, high quality digital art, no text`

    // 4 variações com seeds diferentes, geradas em paralelo
    const seeds = [42, 137, 512, 999]
    const tasks = seeds.map((seed) => {
      const encoded = encodeURIComponent(basePrompt)
      const url = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&seed=${seed}&nologo=true&model=flux`
      return fetchImageBuffer(url)
        .then((buf) => buf.toString('base64'))
        .catch((err) => {
          console.error('[avatar/generate] seed', seed, err.message)
          return null
        })
    })

    const images = (await Promise.all(tasks)).filter(Boolean)

    if (images.length === 0) {
      return res.status(502).json({ error: 'Não foi possível gerar as imagens. Tente novamente.' })
    }

    res.json({ images })
  } catch (err) { next(err) }
})

// ─── POST /avatar/save ────────────────────────────────────────────────────────

const AVATAR_MAX_BYTES = 4 * 1024 * 1024 // 4 MB após decode

router.post('/save', requireAuth, avatarSaveLimiter, async (req, res, next) => {
  try {
    const { imageBase64 } = req.body
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 obrigatório' })
    }

    // Decodifica e verifica tamanho antes de gravar em disco
    const buf = Buffer.from(imageBase64, 'base64')
    if (buf.length > AVATAR_MAX_BYTES) {
      return res.status(413).json({ error: 'Imagem muito grande (máx. 4 MB)' })
    }

    // Valida magic bytes — rejeita qualquer coisa que não seja imagem real
    const mime = detectImageMime(buf)
    if (!mime) {
      return res.status(400).json({ error: 'Formato de imagem não suportado. Use JPEG, PNG, GIF ou WebP.' })
    }

    const ext      = mime === 'image/jpeg' ? '.jpg' : mime === 'image/png' ? '.png' : mime === 'image/gif' ? '.gif' : '.webp'
    const userId   = req.user.id
    const filename = `avatar_${userId}_${Date.now()}_${randomUUID().slice(0, 8)}${ext}`
    const filepath = path.join(AVATAR_DIR, filename)

    fs.writeFileSync(filepath, buf)

    const photoUrl = `/uploads/avatars/${filename}`
    await pool.query('UPDATE users SET photo_url = ? WHERE id = ?', [photoUrl, userId])

    res.json({ photoUrl })
  } catch (err) { next(err) }
})

module.exports = router
