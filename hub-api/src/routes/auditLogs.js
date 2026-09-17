const router = require('express').Router()
const pool   = require('../db/pool')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { auditLogLimiter } = require('../middleware/rateLimits')
const logAudit      = require('../utils/logAudit')
const AUDIT_ACTIONS = require('../utils/auditActions')

const VALID_ACTIONS = Object.keys(AUDIT_ACTIONS).join(', ')

// POST /audit-logs — registra evento do frontend (ação e userName validados server-side)
router.post('/', requireAuth, auditLogLimiter, async (req, res, next) => {
  try {
    const { action, details } = req.body
    if (!action) return res.status(400).json({ error: 'action obrigatório' })
    if (!AUDIT_ACTIONS[action]) {
      return res.status(400).json({ error: `action inválida. Valores aceitos: ${VALID_ACTIONS}` })
    }
    // Limitar tamanho do campo details para evitar inflação do banco
    if (details !== undefined && details !== null) {
      const serialized = JSON.stringify(details)
      if (serialized.length > 2048) {
        return res.status(400).json({ error: 'details excede o tamanho máximo de 2048 caracteres' })
      }
    }
    await logAudit({ uid: req.uid, action, details: details || null, req })
    res.status(201).json({ ok: true })
  } catch (err) { next(err) }
})

// GET /audit-logs/me — logs do próprio usuário com paginação
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const limit  = Math.min(Math.max(Number(req.query.limit)  || 50, 1), 200)
    const offset = Math.max(Number(req.query.offset) || 0, 0)

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM audit_logs WHERE user_id = ?',
      [req.uid]
    )
    const [data] = await pool.query(
      'SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.uid, limit, offset]
    )

    res.json({ data, pagination: { limit, offset, total } })
  } catch (err) { next(err) }
})

// GET /audit-logs — lista todos (admin only) com paginação e filtros
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const limit    = Math.min(Math.max(Number(req.query.limit)  || 50, 1), 200)
    const offset   = Math.max(Number(req.query.offset) || 0, 0)
    const userId   = req.query.user_id   || null
    const action   = req.query.action    || null
    const dateFrom = req.query.date_from || null
    const dateTo   = req.query.date_to   || null

    if (action && !AUDIT_ACTIONS[action]) {
      return res.status(400).json({ error: `action inválida. Valores aceitos: ${VALID_ACTIONS}` })
    }

    const conditions = []
    const params     = []
    if (userId)   { conditions.push('al.user_id = ?');     params.push(userId) }
    if (action)   { conditions.push('al.action = ?');      params.push(action) }
    if (dateFrom) { conditions.push('al.created_at >= ?'); params.push(dateFrom) }
    if (dateTo)   { conditions.push('al.created_at <= ?'); params.push(dateTo) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM audit_logs al ${where}`, params
    )
    const [data] = await pool.query(
      `SELECT al.id, al.user_id, al.user_name, al.action, al.details, al.ip_address, al.created_at,
              u.photo_url AS user_photo_url
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ${where}
       ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    res.json({ data, pagination: { limit, offset, total } })
  } catch (err) { next(err) }
})

module.exports = router
