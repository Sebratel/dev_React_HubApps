const router = require('express').Router()
const pool   = require('../db/pool')
const jwt    = require('jsonwebtoken')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { adminWriteLimiter, ssoLaunchLimiter } = require('../middleware/rateLimits')
const { randomUUID } = require('crypto')
const logAudit      = require('../utils/logAudit')
const AUDIT_ACTIONS = require('../utils/auditActions')

// GET /apps — lista todos os apps ativos para qualquer usuário autenticado com domínio @sebratel.com.br
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const [allApps] = await pool.query(
      `SELECT id, name, description, url, icon_url, card_color, pass_token, pass_user,
              is_active, status
       FROM apps WHERE is_active = 1 ORDER BY name`
    )
    res.json(allApps)
  } catch (err) { next(err) }
})

// GET /apps/all — lista todos (admin only)
router.get('/all', requireAuth, requireAdmin, async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM apps ORDER BY name')
  res.json(rows)
})

// POST /apps — cria app (admin only)
router.post('/', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const { name, url, description, iconUrl, cardColor, passToken, passUser, status, allowedProfiles, allowedUsers, allowedTeams } = req.body
  if (!name || !url) return res.status(400).json({ error: 'name e url obrigatórios' })

  const validStatuses = ['active', 'maintenance', 'novo']
  const appStatus     = validStatuses.includes(status) ? status : 'active'
  const isActive      = appStatus !== 'maintenance' ? 1 : 0

  const id = randomUUID()

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(
      `INSERT INTO apps (id, name, url, description, icon_url, card_color, pass_token, pass_user, is_active, status, allowed_profiles, allowed_users, allowed_teams)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, url,
        description || null,
        iconUrl     || null,
        cardColor   || null,
        passToken   ? 1 : 0,
        passUser    ? 1 : 0,
        isActive,
        appStatus,
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
  const allowed = ['name', 'url', 'description', 'icon_url', 'card_color', 'pass_token', 'pass_user',
                   'is_active', 'status', 'allowed_profiles', 'allowed_users', 'allowed_teams']
  const fields  = Object.keys(req.body).filter(k => allowed.includes(k))
  if (!fields.length) return res.status(400).json({ error: 'Nenhum campo válido' })

  // Manter is_active e status sincronizados
  const body = { ...req.body }
  if ('status' in body && !('is_active' in body)) {
    body.is_active = body.status !== 'maintenance' ? 1 : 0
    if (!fields.includes('is_active')) fields.push('is_active')
  } else if ('is_active' in body && !('status' in body)) {
    body.status = body.is_active ? 'active' : 'maintenance'
    if (!fields.includes('status')) fields.push('status')
  }

  const values = fields.map(f => {
    const v = body[f]
    return Array.isArray(v) ? JSON.stringify(v) : v
  })
  const set = fields.map(f => `\`${f}\` = ?`).join(', ')

  let auditAction = AUDIT_ACTIONS.APP_UPDATE
  if ('is_active' in body) {
    auditAction = body.is_active ? AUDIT_ACTIONS.APP_REACTIVATE : AUDIT_ACTIONS.APP_DEACTIVATE
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

// DELETE /apps/:id — exclui app permanentemente (admin only)
router.delete('/:id', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [existing] = await conn.query('SELECT id, name FROM apps WHERE id = ?', [req.params.id])
    if (!existing.length) {
      conn.release()
      return res.status(404).json({ error: 'App não encontrado' })
    }

    await conn.query('DELETE FROM apps WHERE id = ?', [req.params.id])

    await logAudit({
      uid: req.uid,
      action: AUDIT_ACTIONS.APP_DELETE,
      details: { appId: req.params.id, name: existing[0].name },
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

  res.status(204).end()
})

// POST /apps/:id/launch-token — emite JWT SSO de curta duração para apps com pass_token=1
router.post('/:id/launch-token', requireAuth, ssoLaunchLimiter, async (req, res, next) => {
  const secret = process.env.SSO_JWT_SECRET
  if (!secret) return res.status(503).json({ error: 'SSO não configurado no servidor' })

  try {
    const [appRows] = await pool.query(
      'SELECT id, name, url, pass_token, is_active, allowed_profiles, allowed_users, allowed_teams FROM apps WHERE id = ?',
      [req.params.id]
    )
    if (!appRows.length || !appRows[0].is_active) {
      return res.status(404).json({ error: 'App não encontrado' })
    }
    const app = appRows[0]
    if (!app.pass_token) {
      return res.status(400).json({ error: 'Este app não requer SSO' })
    }

    const [userRows] = await pool.query(
      'SELECT id, name, profile, team FROM users WHERE id = ?',
      [req.uid]
    )
    if (!userRows.length) {
      return res.status(403).json({ error: 'Usuário não encontrado' })
    }
    const u = userRows[0]

    // Verificar se o usuário tem acesso a este app
    const allowedUsers    = JSON.parse(app.allowed_users    || '[]')
    const allowedTeams    = JSON.parse(app.allowed_teams    || '[]')
    const allowedProfiles = JSON.parse(app.allowed_profiles || '[]')

    const isUnrestricted = allowedUsers.length === 0 && allowedTeams.length === 0 && allowedProfiles.length === 0
    const hasAccess = isUnrestricted ||
      allowedUsers.includes(req.uid) ||
      (u.team    && allowedTeams.includes(String(u.team))) ||
      (u.profile && allowedProfiles.includes(u.profile))

    if (!hasAccess) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar este aplicativo' })
    }

    const expSeconds = 300 // 5 minutos
    const token = jwt.sign(
      { sub: req.uid, email: req.email, name: u.name, appId: app.id },
      secret,
      { algorithm: 'HS256', expiresIn: expSeconds }
    )
    const expiresAt = new Date(Date.now() + expSeconds * 1000).toISOString()

    await logAudit({
      uid: req.uid,
      action: AUDIT_ACTIONS.SSO_TOKEN_ISSUE,
      details: { appId: app.id, appName: app.name },
      req,
    })

    res.json({ token, expiresAt })
  } catch (err) {
    next(err)
  }
})

module.exports = router
