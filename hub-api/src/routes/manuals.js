const router      = require('express').Router()
const pool        = require('../db/pool')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { adminWriteLimiter }         = require('../middleware/rateLimits')
const { randomUUID }                = require('crypto')
const logAudit                      = require('../utils/logAudit')
const AUDIT_ACTIONS                 = require('../utils/auditActions')

// GET /manuals — lista manuais ativos (autenticado)
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.*, a.name AS app_name, a.icon_url AS app_icon
      FROM app_manuals m
      JOIN apps a ON a.id = m.app_id
      WHERE m.is_active = 1 AND a.is_active = 1
      ORDER BY a.name
    `)
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// GET /manuals/admin — lista todos (admin)
router.get('/admin', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.*, a.name AS app_name, a.icon_url AS app_icon
      FROM app_manuals m
      JOIN apps a ON a.id = m.app_id
      ORDER BY a.name
    `)
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// POST /manuals — cria manual para app (admin)
router.post('/', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const { appId, wikiUrl, pdfUrl, description } = req.body
  if (!appId) return res.status(400).json({ error: 'appId é obrigatório' })
  if (!wikiUrl && !pdfUrl) return res.status(400).json({ error: 'Informe wikiUrl ou pdfUrl' })

  const id   = randomUUID()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(
      `INSERT INTO app_manuals (id, app_id, wiki_url, pdf_url, description, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [id, appId, wikiUrl || null, pdfUrl || null, description || null, req.uid]
    )

    await logAudit({ uid: req.uid, action: AUDIT_ACTIONS.MANUAL_CREATE, details: { manualId: id, appId }, req, conn })

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    return next(err)
  } finally {
    conn.release()
  }

  const [rows] = await pool.query(`
    SELECT m.*, a.name AS app_name, a.icon_url AS app_icon
    FROM app_manuals m JOIN apps a ON a.id = m.app_id
    WHERE m.id = ?`, [id])
  res.status(201).json(rows[0])
})

// PATCH /manuals/:id — atualiza manual (admin)
router.patch('/:id', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const allowed = ['wiki_url', 'pdf_url', 'description', 'is_active']
  const fields  = Object.keys(req.body).filter(k => allowed.includes(k))
  if (!fields.length) return res.status(400).json({ error: 'Nenhum campo válido' })

  const values = fields.map(f => req.body[f])
  const set    = fields.map(f => `\`${f}\` = ?`).join(', ')

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(
      `UPDATE app_manuals SET ${set}, updated_at = NOW() WHERE id = ?`,
      [...values, req.params.id]
    )

    await logAudit({ uid: req.uid, action: AUDIT_ACTIONS.MANUAL_UPDATE, details: { manualId: req.params.id, fields }, req, conn })

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    return next(err)
  } finally {
    conn.release()
  }

  const [rows] = await pool.query(`
    SELECT m.*, a.name AS app_name, a.icon_url AS app_icon
    FROM app_manuals m JOIN apps a ON a.id = m.app_id
    WHERE m.id = ?`, [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Manual não encontrado' })
  res.json(rows[0])
})

// DELETE /manuals/:id — remove manual (admin)
router.delete('/:id', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [existing] = await conn.query('SELECT id, app_id FROM app_manuals WHERE id = ?', [req.params.id])
    if (!existing.length) {
      await conn.rollback()
      return res.status(404).json({ error: 'Manual não encontrado' })
    }

    await conn.query('DELETE FROM app_manuals WHERE id = ?', [req.params.id])
    await logAudit({ uid: req.uid, action: AUDIT_ACTIONS.MANUAL_DELETE, details: { manualId: req.params.id, appId: existing[0].app_id }, req, conn })

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    return next(err)
  } finally {
    conn.release()
  }

  res.status(204).send()
})

module.exports = router
