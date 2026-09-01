const router  = require('express').Router()
const pool    = require('../db/pool')
const admin   = require('firebase-admin')
const { requireAuth, requireAdmin, invalidateAdminCache } = require('../middleware/auth')
const { provisionLimiter, adminWriteLimiter } = require('../middleware/rateLimits')
const logAudit       = require('../utils/logAudit')
const AUDIT_ACTIONS  = require('../utils/auditActions')

const USER_FIELDS = 'id, email, name, photo_url, profile, team, is_active, is_admin, last_login, created_at'

// GET /users/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${USER_FIELDS} FROM users WHERE id = ?`,
      [req.uid]
    )
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// POST /users/provision — cria ou atualiza usuário no primeiro login (sem race condition)
router.post('/provision', requireAuth, provisionLimiter, async (req, res, next) => {
  const { name, email, photoUrl } = req.body
  if (!name || !email) return res.status(400).json({ error: 'name e email obrigatórios' })
  const normalEmail = email.trim().toLowerCase()

  try {
    await pool.query(
      `INSERT INTO users (id, email, name, photo_url, profile, is_active, is_admin, permissions, last_login, online)
       VALUES (?, ?, ?, ?, '', 1, 0, '[]', NOW(), 1)
       ON DUPLICATE KEY UPDATE
         id = VALUES(id),
         email = VALUES(email),
         photo_url = COALESCE(VALUES(photo_url), photo_url),
         last_login = NOW(),
         online = 1`,
      [req.uid, normalEmail, name, photoUrl || null]
    )

    const [rows] = await pool.query(
      `SELECT ${USER_FIELDS} FROM users WHERE id = ?`,
      [req.uid]
    )
    if (!rows.length) return res.status(500).json({ error: 'Não foi possível provisionar o usuário' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// PATCH /users/me/offline
router.patch('/me/offline', requireAuth, async (req, res, next) => {
  try {
    await pool.query('UPDATE users SET online = 0 WHERE id = ?', [req.uid])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// PATCH /users/me/heartbeat — atualiza presença online
router.patch('/me/heartbeat', requireAuth, async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE users SET last_heartbeat = NOW(), online = 1 WHERE id = ?',
      [req.uid]
    )
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// GET /users/online — admin: usuários ativos nos últimos 2 minutos
router.get('/online', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, photo_url, profile, is_active, last_heartbeat
       FROM users
       WHERE last_heartbeat >= DATE_SUB(NOW(), INTERVAL 2 MINUTE)
         AND is_active = 1
       ORDER BY last_heartbeat DESC
       LIMIT 30`
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// GET /users — lista todos (admin only) com paginação
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const limit  = Math.min(Math.max(Number(req.query.limit)  || 50, 1), 2000)
    const offset = Math.max(Number(req.query.offset) || 0, 0)

    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM users')
    const [data] = await pool.query(
      `SELECT ${USER_FIELDS} FROM users ORDER BY COALESCE(name, email) LIMIT ? OFFSET ?`,
      [limit, offset]
    )

    res.json({ data, pagination: { limit, offset, total } })
  } catch (err) { next(err) }
})

// PATCH /users/:id — atualiza usuário (admin only)
router.patch('/:id', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  if (req.params.id === req.uid && 'is_admin' in req.body) {
    return res.status(403).json({ error: 'Admin não pode alterar o próprio is_admin' })
  }

  if ('is_active' in req.body && 'is_admin' in req.body) {
    return res.status(400).json({ error: 'is_active e is_admin não podem ser alterados na mesma requisição' })
  }

  const allowed = ['is_active', 'is_admin', 'profile', 'team', 'permissions']
  const fields  = Object.keys(req.body).filter(k => allowed.includes(k))
  if (!fields.length) return res.status(400).json({ error: 'Nenhum campo válido' })

  const values = fields.map(f => req.body[f])
  const set    = fields.map(f => `\`${f}\` = ?`).join(', ')

  let auditAction = AUDIT_ACTIONS.USER_UPDATE
  if ('is_admin' in req.body) {
    auditAction = req.body.is_admin ? AUDIT_ACTIONS.USER_PROMOTE_ADMIN : AUDIT_ACTIONS.USER_REVOKE_ADMIN
  } else if ('is_active' in req.body) {
    auditAction = req.body.is_active ? AUDIT_ACTIONS.USER_ACTIVATE : AUDIT_ACTIONS.USER_DEACTIVATE
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(
      `UPDATE users SET ${set} WHERE id = ?`,
      [...values, req.params.id]
    )

    if ('is_admin' in req.body) invalidateAdminCache(req.params.id)

    await logAudit({
      uid:     req.uid,
      action:  auditAction,
      details: { targetUserId: req.params.id, fields },
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
    `SELECT ${USER_FIELDS} FROM users WHERE id = ?`,
    [req.params.id]
  )

  res.json(rows[0])
})

// POST /users/create-external — admin: cria usuário externo com e-mail/senha
router.post('/create-external', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const { name, email, password, profile, teamId } = req.body

  if (!name?.trim())              return res.status(400).json({ error: 'name obrigatório' })
  if (!email?.trim())             return res.status(400).json({ error: 'email obrigatório' })
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'password deve ter ao menos 6 caracteres' })
  }

  const normalEmail = email.trim().toLowerCase()

  // 1. Cria conta Firebase
  let firebaseUid
  try {
    const fbUser = await admin.auth().createUser({
      email:       normalEmail,
      password,
      displayName: name.trim(),
    })
    firebaseUid = fbUser.uid
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'E-mail já está em uso por outra conta' })
    }
    return next(err)
  }

  // 2. Provisiona no MySQL (ativo imediatamente — admin está criando intencionalmente)
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    await conn.query(
      `INSERT INTO users (id, email, name, profile, team, is_active, is_admin, permissions)
       VALUES (?, ?, ?, ?, ?, 1, 0, '[]')`,
      [firebaseUid, normalEmail, name.trim(), profile || '', teamId || null]
    )

    await logAudit({
      uid:     req.uid,
      action:  AUDIT_ACTIONS.USER_CREATE_EXTERNAL,
      details: { createdUid: firebaseUid, email: normalEmail },
      req, conn,
    })

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    // Cleanup: remove conta Firebase para evitar órfão
    try { await admin.auth().deleteUser(firebaseUid) } catch {}
    return next(err)
  } finally {
    conn.release()
  }

  const [rows] = await pool.query(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, [firebaseUid])
  res.status(201).json(rows[0])
})

// PATCH /users/me — usuário atualiza o próprio nome
router.patch('/me', requireAuth, async (req, res, next) => {
  const { name } = req.body
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name é obrigatório' })
  }
  const trimmedName = name.trim().slice(0, 120)

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query('UPDATE users SET name = ? WHERE id = ?', [trimmedName, req.uid])
    await logAudit({
      uid:     req.uid,
      action:  AUDIT_ACTIONS.USER_UPDATE,
      details: { selfUpdate: true, fields: ['name'] },
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

  const [rows] = await pool.query(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, [req.uid])
  res.json(rows[0])
})

// GET /users/me/favorites
router.get('/me/favorites', requireAuth, async (req, res, next) => {
  try {
    const [[row]] = await pool.query('SELECT favorites FROM users WHERE id = ?', [req.uid])
    if (!row) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.json({ favorites: JSON.parse(row.favorites || '[]') })
  } catch (err) { next(err) }
})

// PATCH /users/me/favorites
router.patch('/me/favorites', requireAuth, async (req, res, next) => {
  const { favorites } = req.body
  if (!Array.isArray(favorites) || !favorites.every((f) => typeof f === 'string')) {
    return res.status(400).json({ error: 'favorites deve ser um array de strings' })
  }
  try {
    await pool.query('UPDATE users SET favorites = ? WHERE id = ?', [JSON.stringify(favorites), req.uid])
    res.json({ favorites })
  } catch (err) { next(err) }
})

module.exports = router
