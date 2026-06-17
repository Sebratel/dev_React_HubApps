const router       = require('express').Router()
const pool         = require('../db/pool')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { adminWriteLimiter }         = require('../middleware/rateLimits')
const { randomUUID }                = require('crypto')
const logAudit                      = require('../utils/logAudit')
const AUDIT_ACTIONS                 = require('../utils/auditActions')

// GET /highlights — banners ativos para usuários autenticados
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM highlights WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC'
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// GET /highlights/all — admin: todos os highlights (incluindo inativos)
router.get('/all', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM highlights ORDER BY sort_order ASC, created_at DESC'
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// POST /highlights — admin: criar destaque
router.post('/', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const { title, description, badgeText, ctaLabel, ctaUrl, imageUrl, objectFit, objectPosition, sortOrder } = req.body
  if (!title || !imageUrl) return res.status(400).json({ error: 'title e imageUrl são obrigatórios' })

  const id = randomUUID()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(
      `INSERT INTO highlights (id, title, description, badge_text, cta_label, cta_url, image_url, object_fit, object_position, is_active, sort_order, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        title,
        description || null,
        badgeText  || 'NOVIDADE',
        ctaLabel   || 'Explorar Agora',
        ctaUrl     || null,
        imageUrl,
        objectFit      || 'cover',
        objectPosition || 'center',
        Number(sortOrder) || 0,
        req.uid,
      ]
    )

    await logAudit({ uid: req.uid, action: AUDIT_ACTIONS.HIGHLIGHT_CREATE, details: { id, title }, req, conn })
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    return next(err)
  } finally {
    conn.release()
  }

  const [rows] = await pool.query('SELECT * FROM highlights WHERE id = ?', [id])
  res.status(201).json(rows[0])
})

// PATCH /highlights/:id — admin: editar destaque
router.patch('/:id', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const allowed = ['title', 'description', 'badge_text', 'cta_label', 'cta_url', 'image_url', 'object_fit', 'object_position', 'is_active', 'sort_order']
  const fields  = Object.keys(req.body).filter(k => allowed.includes(k))
  if (!fields.length) return res.status(400).json({ error: 'Nenhum campo válido' })

  const values = fields.map(f => req.body[f])
  const set    = fields.map(f => `\`${f}\` = ?`).join(', ')

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query(`UPDATE highlights SET ${set} WHERE id = ?`, [...values, req.params.id])
    await logAudit({ uid: req.uid, action: AUDIT_ACTIONS.HIGHLIGHT_UPDATE, details: { id: req.params.id, fields }, req, conn })
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    return next(err)
  } finally {
    conn.release()
  }

  const [rows] = await pool.query('SELECT * FROM highlights WHERE id = ?', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Destaque não encontrado' })
  res.json(rows[0])
})

// DELETE /highlights/:id — admin: excluir destaque
router.delete('/:id', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [existing] = await conn.query('SELECT id, title FROM highlights WHERE id = ?', [req.params.id])
    if (!existing.length) {
      conn.release()
      return res.status(404).json({ error: 'Destaque não encontrado' })
    }

    await conn.query('DELETE FROM highlights WHERE id = ?', [req.params.id])
    await logAudit({ uid: req.uid, action: AUDIT_ACTIONS.HIGHLIGHT_DELETE, details: { id: req.params.id, title: existing[0].title }, req, conn })
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
