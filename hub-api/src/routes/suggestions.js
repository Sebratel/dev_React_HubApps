const router = require('express').Router()
const pool   = require('../db/pool')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { adminWriteLimiter }         = require('../middleware/rateLimits')
const { randomUUID }                = require('crypto')
const logAudit                      = require('../utils/logAudit')
const AUDIT_ACTIONS                 = require('../utils/auditActions')

const VALID_TYPES    = ['feature', 'bug', 'improvement', 'other']
const VALID_STATUSES = ['pending', 'in_review', 'done', 'rejected']

// GET /suggestions — sugestões do usuário autenticado
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM suggestions WHERE user_id = ? ORDER BY created_at DESC',
      [req.uid]
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// GET /suggestions/all — admin: todas as sugestões
router.get('/all', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM suggestions ORDER BY created_at DESC'
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// POST /suggestions — usuário: criar sugestão
router.post('/', requireAuth, async (req, res, next) => {
  const [userRows] = await pool.query(
    'SELECT name, is_active FROM users WHERE id = ?',
    [req.uid]
  )
  if (!userRows.length || !userRows[0].is_active) {
    return res.status(403).json({ error: 'Usuário inativo' })
  }

  const { title, body, type, appId, appName } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'title obrigatório' })

  const suggType = VALID_TYPES.includes(type) ? type : 'other'
  const id       = randomUUID()

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(
      `INSERT INTO suggestions (id, app_id, app_name, user_id, user_name, title, body, type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, appId || null, appName || null, req.uid, userRows[0].name,
       title.trim(), body?.trim() || null, suggType]
    )

    await logAudit({
      uid: req.uid, action: AUDIT_ACTIONS.SUGGESTION_CREATE,
      details: { id, title: title.trim(), appId: appId || null }, req, conn,
    })

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    return next(err)
  } finally {
    conn.release()
  }

  const [rows] = await pool.query('SELECT * FROM suggestions WHERE id = ?', [id])
  res.status(201).json(rows[0])
})

// PATCH /suggestions/:id/status — admin: atualizar status e nota
router.patch('/:id/status', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const { status, adminNote } = req.body
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status inválido. Use: ${VALID_STATUSES.join(', ')}` })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(
      'UPDATE suggestions SET status = ?, admin_note = ? WHERE id = ?',
      [status, adminNote?.trim() || null, req.params.id]
    )

    await logAudit({
      uid: req.uid, action: AUDIT_ACTIONS.SUGGESTION_STATUS_UPDATE,
      details: { id: req.params.id, status }, req, conn,
    })

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    return next(err)
  } finally {
    conn.release()
  }

  const [rows] = await pool.query('SELECT * FROM suggestions WHERE id = ?', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Sugestão não encontrada' })
  res.json(rows[0])
})

module.exports = router
