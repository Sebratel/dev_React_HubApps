const router = require('express').Router()
const pool   = require('../db/pool')
const { requireAuth } = require('../middleware/auth')
const { birthdayWishLimiter } = require('../middleware/rateLimits')
const { stripHtml } = require('../utils/sanitize')
const { randomUUID } = require('crypto')

// GET /birthday-wishes — aniversariantes de hoje + parabéns recebidos
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const [celebrants] = await pool.query(`
      SELECT id, name, photo_url
      FROM users
      WHERE is_active = 1
        AND birth_date IS NOT NULL
        AND MONTH(birth_date) = MONTH(CURDATE())
        AND DAY(birth_date)   = DAY(CURDATE())
      ORDER BY name
    `)

    if (!celebrants.length) return res.json([])

    const ids = celebrants.map(c => c.id)

    const [wishes] = await pool.query(`
      SELECT bw.id, bw.to_user_id, bw.message, bw.created_at,
             u.id AS from_id, u.name AS from_name, u.photo_url AS from_photo
      FROM birthday_wishes bw
      JOIN users u ON u.id = bw.from_user_id
      WHERE bw.to_user_id IN (?)
        AND DATE(bw.created_at) = CURDATE()
      ORDER BY bw.created_at DESC
    `, [ids])

    const result = celebrants.map(c => ({
      id:       c.id,
      name:     c.name,
      photoUrl: c.photo_url,
      wishes:   wishes
        .filter(w => w.to_user_id === c.id)
        .map(w => ({
          id:        w.id,
          message:   w.message,
          createdAt: w.created_at,
          from: { id: w.from_id, name: w.from_name, photoUrl: w.from_photo },
        })),
    }))

    res.json(result)
  } catch (err) { next(err) }
})

// POST /birthday-wishes — enviar parabéns
router.post('/', requireAuth, birthdayWishLimiter, async (req, res, next) => {
  const { toUserId, message } = req.body
  if (!toUserId || typeof toUserId !== 'string') {
    return res.status(400).json({ error: 'toUserId obrigatório' })
  }
  const trimmed = stripHtml(message, 300)
  if (!trimmed) {
    return res.status(400).json({ error: 'message obrigatório (máx 300 caracteres)' })
  }

  try {
    // Verifica se o destinatário faz aniversário hoje
    const [[target]] = await pool.query(`
      SELECT id FROM users
      WHERE id = ? AND is_active = 1
        AND birth_date IS NOT NULL
        AND MONTH(birth_date) = MONTH(CURDATE())
        AND DAY(birth_date)   = DAY(CURDATE())
    `, [toUserId])

    if (!target) {
      return res.status(400).json({ error: 'Usuário não faz aniversário hoje' })
    }

    // Impede parabéns duplicados na mesma data
    const [[existing]] = await pool.query(`
      SELECT id FROM birthday_wishes
      WHERE from_user_id = ? AND to_user_id = ? AND DATE(created_at) = CURDATE()
    `, [req.uid, toUserId])

    if (existing) {
      return res.status(409).json({ error: 'Você já enviou parabéns para esta pessoa hoje' })
    }

    const id = randomUUID()
    await pool.query(
      'INSERT INTO birthday_wishes (id, from_user_id, to_user_id, message) VALUES (?, ?, ?, ?)',
      [id, req.uid, toUserId, trimmed]
    )

    res.status(201).json({ id, ok: true })
  } catch (err) { next(err) }
})

module.exports = router
