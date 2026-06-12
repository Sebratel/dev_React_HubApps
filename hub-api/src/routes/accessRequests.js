const router = require('express').Router()
const pool   = require('../db/pool')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { adminWriteLimiter } = require('../middleware/rateLimits')
const { randomUUID } = require('crypto')
const logAudit      = require('../utils/logAudit')
const AUDIT_ACTIONS = require('../utils/auditActions')

// Columns returned by all admin SELECT queries (includes user/reviewer JOINs)
const ADMIN_SELECT = `
  ar.id, ar.user_id, ar.app_id, ar.app_name, ar.reason, ar.status,
  ar.reviewed_by, ar.reviewed_at, ar.created_at, ar.updated_at,
  u.name  AS user_name,
  u.email AS user_email,
  u.team  AS user_team,
  r.name  AS reviewer_name
FROM access_requests ar
LEFT JOIN users u ON ar.user_id  = u.id
LEFT JOIN users r ON ar.reviewed_by = r.id
`

// POST /access-requests
router.post('/', requireAuth, async (req, res, next) => {
  const { appId, appName, reason } = req.body
  if (!appId || !appName) return res.status(400).json({ error: 'appId e appName obrigatórios' })

  try {
    const [app] = await pool.query('SELECT id FROM apps WHERE id = ? AND is_active = 1', [appId])
    if (!app.length) return res.status(404).json({ error: 'Aplicativo não encontrado' })

    const id   = randomUUID()
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      await conn.query(
        `INSERT INTO access_requests (id, user_id, app_id, app_name, reason) VALUES (?, ?, ?, ?, ?)`,
        [id, req.uid, appId, appName, reason || null]
      )

      await logAudit({
        uid:     req.uid,
        action:  AUDIT_ACTIONS.ACCESS_REQUEST_CREATE,
        details: { requestId: id, appId, appName },
        req,
        conn,
      })

      await conn.commit()
    } catch (err) {
      await conn.rollback()
      return next(err)
    } finally {
      conn.release()
    }

    res.status(201).json({ id })
  } catch (err) { next(err) }
})

// GET /access-requests/me — com paginação
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const limit  = Math.min(Math.max(Number(req.query.limit)  || 50, 1), 200)
    const offset = Math.max(Number(req.query.offset) || 0, 0)

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM access_requests WHERE user_id = ?', [req.uid]
    )
    const [data] = await pool.query(
      'SELECT * FROM access_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.uid, limit, offset]
    )

    res.json({ data, pagination: { limit, offset, total } })
  } catch (err) { next(err) }
})

// GET /access-requests — lista todas (admin only) com paginação e filtros
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const limit  = Math.min(Math.max(Number(req.query.limit)  || 50, 1), 200)
    const offset = Math.max(Number(req.query.offset) || 0, 0)
    const status = req.query.status  || null
    const appId  = req.query.app_id  || null
    const userId = req.query.user_id || null

    const validStatuses = ['pending', 'approved', 'rejected']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `status inválido. Valores aceitos: ${validStatuses.join(', ')}` })
    }

    const conditions = []
    const params     = []
    if (status) { conditions.push('ar.status = ?');  params.push(status) }
    if (appId)  { conditions.push('ar.app_id = ?');  params.push(appId) }
    if (userId) { conditions.push('ar.user_id = ?'); params.push(userId) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM access_requests ar ${where}`, params
    )
    const [data] = await pool.query(
      `SELECT ${ADMIN_SELECT} ${where} ORDER BY ar.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    res.json({ data, pagination: { limit, offset, total } })
  } catch (err) { next(err) }
})

// PATCH /access-requests/:id — aprova ou rejeita (admin only)
router.patch('/:id', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const { status } = req.body
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status deve ser approved ou rejected' })
  }

  try {
    const [existing] = await pool.query(
      'SELECT id, user_id, app_id, app_name, status FROM access_requests WHERE id = ?',
      [req.params.id]
    )
    if (!existing.length) return res.status(404).json({ error: 'Solicitação não encontrada' })
    if (existing[0].status !== 'pending') {
      return res.status(409).json({ error: 'Solicitação já foi processada' })
    }

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      await conn.query(
        `UPDATE access_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
        [status, req.uid, req.params.id]
      )

      // Aprovação: adiciona o usuário ao allowed_users do app na mesma transação
      if (status === 'approved') {
        const [[app]] = await conn.query(
          'SELECT allowed_users FROM apps WHERE id = ?',
          [existing[0].app_id]
        )
        if (app) {
          const allowedUsers = JSON.parse(app.allowed_users || '[]')
          if (!allowedUsers.includes(existing[0].user_id)) {
            allowedUsers.push(existing[0].user_id)
            await conn.query(
              'UPDATE apps SET allowed_users = ? WHERE id = ?',
              [JSON.stringify(allowedUsers), existing[0].app_id]
            )
          }
        }
      }

      await logAudit({
        uid:     req.uid,
        action:  status === 'approved' ? AUDIT_ACTIONS.ACCESS_REQUEST_APPROVE : AUDIT_ACTIONS.ACCESS_REQUEST_REJECT,
        details: {
          requestId:    req.params.id,
          targetUserId: existing[0].user_id,
          appId:        existing[0].app_id,
          appName:      existing[0].app_name,
        },
        req,
        conn,
      })

      await conn.commit()
    } catch (err) {
      await conn.rollback()
      return next(err)
    } finally {
      conn.release()
    }

    const [rows] = await pool.query(
      `SELECT ${ADMIN_SELECT} WHERE ar.id = ?`, [req.params.id]
    )
    res.json(rows[0])
  } catch (err) { next(err) }
})

module.exports = router
