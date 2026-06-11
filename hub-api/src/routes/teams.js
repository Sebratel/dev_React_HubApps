const router = require('express').Router()
const pool   = require('../db/pool')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { adminWriteLimiter }         = require('../middleware/rateLimits')
const { randomUUID }                = require('crypto')
const logAudit                      = require('../utils/logAudit')
const AUDIT_ACTIONS                 = require('../utils/auditActions')

// GET /teams — lista times ativos (usuários autenticados, para dropdowns)
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.id, t.name, t.description,
              COUNT(u.id) AS member_count
       FROM teams t
       LEFT JOIN users u ON u.team = t.id AND u.is_active = 1
       WHERE t.is_active = 1
       GROUP BY t.id
       ORDER BY t.name`
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// GET /teams/all — admin: todos os times (incluindo inativos)
router.get('/all', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.id, t.name, t.description, t.is_active, t.created_at, t.updated_at,
              COUNT(u.id) AS member_count
       FROM teams t
       LEFT JOIN users u ON u.team = t.id AND u.is_active = 1
       GROUP BY t.id
       ORDER BY t.name`
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// POST /teams — admin: criar time
router.post('/', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const { name, description } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name obrigatório' })

  const id = randomUUID()

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(
      'INSERT INTO teams (id, name, description) VALUES (?, ?, ?)',
      [id, name.trim(), description?.trim() || null]
    )

    await logAudit({
      uid: req.uid, action: AUDIT_ACTIONS.TEAM_CREATE,
      details: { id, name: name.trim() }, req, conn,
    })

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Já existe um time com esse nome.' })
    }
    return next(err)
  } finally {
    conn.release()
  }

  const [rows] = await pool.query(
    `SELECT t.id, t.name, t.description, t.is_active, t.created_at, t.updated_at,
            COUNT(u.id) AS member_count
     FROM teams t
     LEFT JOIN users u ON u.team = t.id AND u.is_active = 1
     WHERE t.id = ?
     GROUP BY t.id`,
    [id]
  )
  res.status(201).json(rows[0])
})

// PATCH /teams/:id — admin: atualizar time
router.patch('/:id', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const allowed = ['name', 'description', 'is_active']
  const fields  = Object.keys(req.body).filter(k => allowed.includes(k))
  if (!fields.length) return res.status(400).json({ error: 'Nenhum campo válido' })

  const values = fields.map(f => req.body[f])
  const set    = fields.map(f => `\`${f}\` = ?`).join(', ')

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(`UPDATE teams SET ${set} WHERE id = ?`, [...values, req.params.id])

    await logAudit({
      uid: req.uid, action: AUDIT_ACTIONS.TEAM_UPDATE,
      details: { id: req.params.id, fields }, req, conn,
    })

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Já existe um time com esse nome.' })
    }
    return next(err)
  } finally {
    conn.release()
  }

  const [rows] = await pool.query(
    `SELECT t.id, t.name, t.description, t.is_active, t.created_at, t.updated_at,
            COUNT(u.id) AS member_count
     FROM teams t
     LEFT JOIN users u ON u.team = t.id AND u.is_active = 1
     WHERE t.id = ?
     GROUP BY t.id`,
    [req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'Time não encontrado' })
  res.json(rows[0])
})

// DELETE /teams/:id — admin: desativar time (soft delete)
router.delete('/:id', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const [existing] = await pool.query(
    'SELECT id FROM teams WHERE id = ?', [req.params.id]
  )
  if (!existing.length) return res.status(404).json({ error: 'Time não encontrado' })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query('UPDATE teams SET is_active = 0 WHERE id = ?', [req.params.id])

    await logAudit({
      uid: req.uid, action: AUDIT_ACTIONS.TEAM_DELETE,
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
