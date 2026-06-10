const router = require('express').Router()
const pool   = require('../db/pool')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { adminWriteLimiter } = require('../middleware/rateLimits')
const { randomUUID } = require('crypto')
const logAudit      = require('../utils/logAudit')
const AUDIT_ACTIONS = require('../utils/auditActions')

// GET /apps — lista apps acessíveis ao usuário autenticado
router.get('/', requireAuth, async (req, res) => {
  const [user] = await pool.query(
    'SELECT id, profile, team, is_active FROM users WHERE id = ?',
    [req.uid]
  )
  if (!user.length || !user[0].is_active) return res.json([])

  const [allApps] = await pool.query(
    'SELECT * FROM apps WHERE is_active = 1 ORDER BY name'
  )

  const u           = user[0]
  const userProfile = u.profile || ''
  const userTeam    = u.team    || null

  const visible = allApps.filter(app => {
    const profiles = JSON.parse(app.allowed_profiles || '[]')
    const users    = JSON.parse(app.allowed_users    || '[]')
    const teams    = JSON.parse(app.allowed_teams    || '[]')
    return (
      profiles.includes(userProfile) ||
      users.includes(req.uid)        ||
      (userTeam && teams.includes(userTeam))
    )
  })

  res.json(visible)
})

// GET /apps/all — lista todos (admin only)
router.get('/all', requireAuth, requireAdmin, async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM apps ORDER BY name')
  res.json(rows)
})

// POST /apps — cria app (admin only)
router.post('/', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const { name, url, description, iconUrl, passToken, allowedProfiles, allowedUsers, allowedTeams } = req.body
  if (!name || !url) return res.status(400).json({ error: 'name e url obrigatórios' })

  const id = randomUUID()

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(
      `INSERT INTO apps (id, name, url, description, icon_url, pass_token, allowed_profiles, allowed_users, allowed_teams)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, url,
        description || null,
        iconUrl     || null,
        passToken   ? 1 : 0,
        JSON.stringify(allowedProfiles || []),
        JSON.stringify(allowedUsers    || []),
        JSON.stringify(allowedTeams    || []),
      ]
    )

    await logAudit({ uid: req.uid, action: AUDIT_ACTIONS.APP_CREATE, details: { appId: id, name }, req, conn })

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    return next(err)
  } finally {
    conn.release()
  }

  const [rows] = await pool.query('SELECT * FROM apps WHERE id = ?', [id])
  res.status(201).json(rows[0])
})

// PATCH /apps/:id — atualiza app (admin only)
router.patch('/:id', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const allowed = ['name', 'url', 'description', 'icon_url', 'pass_token',
                   'is_active', 'allowed_profiles', 'allowed_users', 'allowed_teams']
  const fields  = Object.keys(req.body).filter(k => allowed.includes(k))
  if (!fields.length) return res.status(400).json({ error: 'Nenhum campo válido' })

  const values = fields.map(f => {
    const v = req.body[f]
    return Array.isArray(v) ? JSON.stringify(v) : v
  })
  const set = fields.map(f => `\`${f}\` = ?`).join(', ')

  let auditAction = AUDIT_ACTIONS.APP_UPDATE
  if ('is_active' in req.body) {
    auditAction = req.body.is_active ? AUDIT_ACTIONS.APP_REACTIVATE : AUDIT_ACTIONS.APP_DEACTIVATE
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(`UPDATE apps SET ${set} WHERE id = ?`, [...values, req.params.id])

    await logAudit({ uid: req.uid, action: auditAction, details: { appId: req.params.id, fields }, req, conn })

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    return next(err)
  } finally {
    conn.release()
  }

  const [rows] = await pool.query('SELECT * FROM apps WHERE id = ?', [req.params.id])
  res.json(rows[0])
})

module.exports = router
