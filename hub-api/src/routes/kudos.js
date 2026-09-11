const router = require('express').Router()
const pool = require('../db/pool')
const { requireAuth } = require('../middleware/auth')
const { kudosLimiter } = require('../middleware/rateLimits')
const logAudit = require('../utils/logAudit')
const AUDIT_ACTIONS = require('../utils/auditActions')
const { randomUUID } = require('crypto')
const { stripHtml } = require('../utils/sanitize')

// GET /kudos — feed dos últimos kudos enviados
// Quando is_anonymous = 1, o remetente é mascarado na resposta (apenas o DB guarda a identidade real).
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        k.id, k.message, k.created_at, k.is_anonymous,
        CASE WHEN k.is_anonymous = 1 THEN NULL        ELSE fu.id       END AS from_id,
        CASE WHEN k.is_anonymous = 1 THEN 'Anônimo'  ELSE fu.name     END AS from_name,
        CASE WHEN k.is_anonymous = 1 THEN NULL        ELSE fu.photo_url END AS from_photo,
        tu.id       AS to_id,  tu.name AS to_name,  tu.photo_url AS to_photo
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
  const { toUserId, message, isAnonymous } = req.body

  if (!toUserId)                      return res.status(400).json({ error: 'toUserId obrigatório' })
  if (!message || !message.trim())    return res.status(400).json({ error: 'message obrigatório' })
  if (toUserId === req.uid)           return res.status(400).json({ error: 'Você não pode enviar um kudo para si mesmo' })

  const trimmed   = stripHtml(message, 300)
  const anonymous = isAnonymous === true ? 1 : 0

  try {
    const [[recipient]] = await pool.query('SELECT id, name FROM users WHERE id = ? AND is_active = 1', [toUserId])
    if (!recipient) return res.status(404).json({ error: 'Destinatário não encontrado' })

    const id = randomUUID()
    await pool.query(
      'INSERT INTO kudos (id, from_user_id, to_user_id, message, is_anonymous) VALUES (?, ?, ?, ?, ?)',
      [id, req.uid, toUserId, trimmed, anonymous]
    )

    await logAudit({
      uid:     req.uid,
      action:  AUDIT_ACTIONS.KUDO_SENT,
      details: { toUserId, toUserName: recipient.name, isAnonymous: !!anonymous },
      req,
    })

    const [[kudo]] = await pool.query(`
      SELECT
        k.id, k.message, k.created_at, k.is_anonymous,
        CASE WHEN k.is_anonymous = 1 THEN NULL        ELSE fu.id        END AS from_id,
        CASE WHEN k.is_anonymous = 1 THEN 'Anônimo'  ELSE fu.name      END AS from_name,
        CASE WHEN k.is_anonymous = 1 THEN NULL        ELSE fu.photo_url END AS from_photo,
        tu.id AS to_id,  tu.name AS to_name,  tu.photo_url AS to_photo
      FROM kudos k
      JOIN users fu ON fu.id = k.from_user_id
      JOIN users tu ON tu.id = k.to_user_id
      WHERE k.id = ?
    `, [id])

    res.status(201).json(kudo)
  } catch (err) { next(err) }
})

// GET /kudos/mvp — top 3 usuários com mais kudos recebidos nos últimos 7 dias
router.get('/mvp', requireAuth, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        u.id, u.name, u.photo_url,
        COUNT(*) AS kudo_count
      FROM kudos k
      JOIN users u ON u.id = k.to_user_id
      WHERE k.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY u.id, u.name, u.photo_url
      ORDER BY kudo_count DESC
      LIMIT 3
    `)
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /kudos/user/:userId — últimos kudos recebidos por um usuário (para perfil público)
router.get('/user/:userId', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        k.id, k.message, k.created_at, k.is_anonymous,
        CASE WHEN k.is_anonymous = 1 THEN NULL        ELSE fu.id        END AS from_id,
        CASE WHEN k.is_anonymous = 1 THEN 'Anônimo'  ELSE fu.name      END AS from_name,
        CASE WHEN k.is_anonymous = 1 THEN NULL        ELSE fu.photo_url END AS from_photo,
        tu.id AS to_id, tu.name AS to_name, tu.photo_url AS to_photo
      FROM kudos k
      JOIN users fu ON fu.id = k.from_user_id
      JOIN users tu ON tu.id = k.to_user_id
      WHERE k.to_user_id = ?
      ORDER BY k.created_at DESC
      LIMIT 5
    `, [req.params.userId])
    res.json(rows)
  } catch (err) { next(err) }
})

module.exports = router
