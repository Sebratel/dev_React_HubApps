const router = require('express').Router()
const pool = require('../db/pool')
const { requireAuth } = require('../middleware/auth')
const { kudosLimiter } = require('../middleware/rateLimits')
const logAudit = require('../utils/logAudit')
const AUDIT_ACTIONS = require('../utils/auditActions')
const { randomUUID } = require('crypto')

// GET /kudos — feed dos últimos kudos enviados
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        k.id, k.message, k.created_at,
        fu.id       AS from_id,    fu.name      AS from_name,  fu.photo_url AS from_photo,
        tu.id       AS to_id,      tu.name      AS to_name,    tu.photo_url AS to_photo
      FROM kudos k
      JOIN users fu ON fu.id = k.from_user_id
      JOIN users tu ON tu.id = k.to_user_id
      ORDER BY k.created_at DESC
      LIMIT 20
    `)
    res.json(rows)
  } catch (err) { next(err) }
})

// POST /kudos — enviar kudo para um colega
router.post('/', requireAuth, kudosLimiter, async (req, res, next) => {
  const { toUserId, message } = req.body

  if (!toUserId)                      return res.status(400).json({ error: 'toUserId obrigatório' })
  if (!message || !message.trim())    return res.status(400).json({ error: 'message obrigatório' })
  if (toUserId === req.uid)           return res.status(400).json({ error: 'Você não pode enviar um kudo para si mesmo' })

  const trimmed = message.trim().slice(0, 300)

  try {
    const [[recipient]] = await pool.query('SELECT id, name FROM users WHERE id = ? AND is_active = 1', [toUserId])
    if (!recipient) return res.status(404).json({ error: 'Destinatário não encontrado' })

    const id = randomUUID()
    await pool.query(
      'INSERT INTO kudos (id, from_user_id, to_user_id, message) VALUES (?, ?, ?, ?)',
      [id, req.uid, toUserId, trimmed]
    )

    await logAudit({
      uid:     req.uid,
      action:  AUDIT_ACTIONS.KUDO_SENT,
      details: { toUserId, toUserName: recipient.name },
      req,
    })

    const [[kudo]] = await pool.query(`
      SELECT
        k.id, k.message, k.created_at,
        fu.id       AS from_id,    fu.name      AS from_name,  fu.photo_url AS from_photo,
        tu.id       AS to_id,      tu.name      AS to_name,    tu.photo_url AS to_photo
      FROM kudos k
      JOIN users fu ON fu.id = k.from_user_id
      JOIN users tu ON tu.id = k.to_user_id
      WHERE k.id = ?
    `, [id])

    res.status(201).json(kudo)
  } catch (err) { next(err) }
})

module.exports = router
