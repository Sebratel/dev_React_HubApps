const router = require('express').Router()
const pool   = require('../db/pool')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { adminWriteLimiter }         = require('../middleware/rateLimits')
const { randomUUID }                = require('crypto')
const logAudit                      = require('../utils/logAudit')
const AUDIT_ACTIONS                 = require('../utils/auditActions')

const VALID_TYPES = ['info', 'warning', 'urgent', 'success']

// GET /announcements — avisos ativos visíveis ao usuário logado
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [userRows] = await pool.query(
      'SELECT profile, is_active FROM users WHERE id = ?',
      [req.uid]
    )
    if (!userRows.length || !userRows[0].is_active) return res.json([])

    const [rows] = await pool.query(
      'SELECT * FROM announcements WHERE is_active = 1 ORDER BY created_at DESC LIMIT 50'
    )

    const userProfile = userRows[0].profile || ''
    const visible = rows.filter(a => {
      const profiles = JSON.parse(a.allowed_profiles || '[]')
      return profiles.length === 0 || profiles.includes(userProfile)
    })

    res.json(visible)
  } catch (err) {
    next(err)
  }
})

// GET /announcements/all — admin: todos os avisos (incluindo inativos)
router.get('/all', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM announcements ORDER BY created_at DESC'
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// POST /announcements — admin: criar aviso
router.post('/', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const { title, body, type, allowedProfiles } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'title obrigatório' })

  const annoType = VALID_TYPES.includes(type) ? type : 'info'
  const id       = randomUUID()

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(
      `INSERT INTO announcements (id, title, body, type, is_active, created_by, allowed_profiles)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [id, title.trim(), body || null, annoType, req.uid, JSON.stringify(allowedProfiles || [])]
    )

    await logAudit({
      uid: req.uid, action: AUDIT_ACTIONS.ANNOUNCEMENT_CREATE,
      details: { id, title: title.trim() }, req, conn,
    })

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    return next(err)
  } finally {
    conn.release()
  }

  const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [id])
  res.status(201).json(rows[0])
})

// PATCH /announcements/:id — admin: atualizar aviso
router.patch('/:id', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const allowed = ['title', 'body', 'type', 'is_active', 'allowed_profiles']
  const fields  = Object.keys(req.body).filter(k => allowed.includes(k))
  if (!fields.length) return res.status(400).json({ error: 'Nenhum campo válido' })

  const body = { ...req.body }
  if ('type' in body && !VALID_TYPES.includes(body.type)) {
    return res.status(400).json({ error: `type inválido. Use: ${VALID_TYPES.join(', ')}` })
  }

  const values = fields.map(f => Array.isArray(body[f]) ? JSON.stringify(body[f]) : body[f])
  const set    = fields.map(f => `\`${f}\` = ?`).join(', ')

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(`UPDATE announcements SET ${set} WHERE id = ?`, [...values, req.params.id])

    await logAudit({
      uid: req.uid, action: AUDIT_ACTIONS.ANNOUNCEMENT_UPDATE,
      details: { id: req.params.id, fields }, req, conn,
    })

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    return next(err)
  } finally {
    conn.release()
  }

  const [rows] = await pool.query('SELECT * FROM announcements WHERE id = ?', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Aviso não encontrado' })
  res.json(rows[0])
})

// DELETE /announcements/:id — admin: desativar aviso (soft delete)
router.delete('/:id', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const [existing] = await pool.query(
    'SELECT id FROM announcements WHERE id = ?', [req.params.id]
  )
  if (!existing.length) return res.status(404).json({ error: 'Aviso não encontrado' })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query('UPDATE announcements SET is_active = 0 WHERE id = ?', [req.params.id])

    await logAudit({
      uid: req.uid, action: AUDIT_ACTIONS.ANNOUNCEMENT_DELETE,
      details: { id: req.params.id }, req, conn,
    })

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    return next(err)
  } finally {
    conn.release()
  }

  res.status(204).end()
})

module.exports = router
