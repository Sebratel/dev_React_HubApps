const router  = require('express').Router()
const pool    = require('../db/pool')
const admin   = require('firebase-admin')
const { requireAuth, requireAdmin, invalidateAdminCache } = require('../middleware/auth')
const { provisionLimiter, adminWriteLimiter } = require('../middleware/rateLimits')
const logAudit       = require('../utils/logAudit')
const AUDIT_ACTIONS  = require('../utils/auditActions')

const USER_FIELDS = 'u.id, u.email, u.name, u.photo_url, u.profile, u.team, t.name AS team_name, u.is_active, u.is_admin, u.last_login, u.created_at, u.birth_date, u.hire_date, u.status'
const USER_FROM   = 'users u LEFT JOIN teams t ON t.id = u.team'

// GET /users/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${USER_FIELDS} FROM ${USER_FROM} WHERE u.id = ?`,
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
      `SELECT ${USER_FIELDS} FROM ${USER_FROM} WHERE u.id = ?`,
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

// PATCH /users/me — usuário atualiza o próprio nome e/ou data de nascimento
// IMPORTANTE: deve ficar ANTES de PATCH /:id, senão Express casa /me como id="me"
router.patch('/me', requireAuth, async (req, res, next) => {
  const { name, birth_date } = req.body
  const updates = []
  const values  = []
  const fields  = []

  if (name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name inválido' })
    }
    updates.push('name = ?')
    values.push(name.trim().slice(0, 120))
    fields.push('name')
  }

  if (birth_date !== undefined) {
    if (birth_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(String(birth_date))) {
      return res.status(400).json({ error: 'birth_date inválido — use o formato YYYY-MM-DD' })
    }
    updates.push('birth_date = ?')
    values.push(birth_date || null)
    fields.push('birth_date')
  }

  if ('status' in req.body) {
    const { status } = req.body
    if (status !== null && (typeof status !== 'string' || status.length > 80)) {
      return res.status(400).json({ error: 'status inválido — máximo 80 caracteres' })
    }
    // Sanitiza HTML do status (exibido no Diretório de Pessoas)
    const { stripHtml } = require('../utils/sanitize')
    const cleanStatus = status ? stripHtml(status, 80) : null
    updates.push('status = ?')
    values.push(cleanStatus)
    fields.push('status')
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'Nenhum campo válido para atualizar' })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, [...values, req.uid])
    await logAudit({
      uid:     req.uid,
      action:  AUDIT_ACTIONS.USER_UPDATE,
      details: { selfUpdate: true, fields },
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

  const [rows] = await pool.query(`SELECT ${USER_FIELDS} FROM ${USER_FROM} WHERE u.id = ?`, [req.uid])
  res.json(rows[0])
})

// GET /users/online — admin: usuários ativos nos últimos 2 minutos
router.get('/online', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    // Corrige flags `online` desatualizadas (browser fechado sem disparar /offline)
    await pool.query(
      `UPDATE users
       SET online = 0
       WHERE online = 1
         AND (last_heartbeat IS NULL OR last_heartbeat < DATE_SUB(NOW(), INTERVAL 2 MINUTE))`
    )

    const [rows] = await pool.query(
      `SELECT id, name, email, photo_url, profile, is_active, last_heartbeat
       FROM users
       WHERE last_heartbeat >= DATE_SUB(NOW(), INTERVAL 2 MINUTE)
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
      `SELECT ${USER_FIELDS} FROM ${USER_FROM} ORDER BY COALESCE(u.name, u.email) LIMIT ? OFFSET ?`,
      [limit, offset]
    )

    res.json({ data, pagination: { limit, offset, total } })
  } catch (err) { next(err) }
})

// GET /users/people — diretório enriquecido para a página /pessoas
// ⚠️ deve ficar ANTES de /:id
router.get('/people', requireAuth, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.photo_url, u.profile, u.status,
             t.name AS team_name,
             u.birth_date, u.hire_date,
             COALESCE(kc.kudo_count, 0) AS kudo_count
      FROM users u
      LEFT JOIN teams t ON t.id = u.team
      LEFT JOIN (
        SELECT to_user_id, COUNT(*) AS kudo_count
        FROM kudos
        GROUP BY to_user_id
      ) kc ON kc.to_user_id = u.id
      WHERE u.is_active = 1
      ORDER BY COALESCE(u.name, u.email)
    `)

    const today        = new Date()
    const currentMonth = today.getUTCMonth() + 1
    const currentDay   = today.getUTCDate()
    const currentYear  = today.getUTCFullYear()

    const result = rows.map(r => {
      let birthdayToday = false
      let birthdayThisMonth = false
      let birthMonth = null
      let birthDay   = null
      let tenureYears = null

      if (r.birth_date) {
        const parts = String(r.birth_date).split('-')
        birthMonth = Number(parts[1])
        birthDay   = Number(parts[2])
        birthdayToday     = birthMonth === currentMonth && birthDay === currentDay
        birthdayThisMonth = birthMonth === currentMonth
      }

      if (r.hire_date) {
        const hd    = new Date(r.hire_date)
        const years = currentYear - hd.getUTCFullYear()
        if (years >= 1) tenureYears = years
      }

      return {
        id: r.id, name: r.name, photoUrl: r.photo_url,
        profile: r.profile, status: r.status, teamName: r.team_name,
        kudoCount: Number(r.kudo_count),
        birthMonth, birthDay,
        birthdayToday, birthdayThisMonth,
        tenureYears,
      }
    })

    res.json(result)
  } catch (err) { next(err) }
})

// GET /users/me/stats — estatísticas do usuário logado (kudos enviados/recebidos)
router.get('/me/stats', requireAuth, async (req, res, next) => {
  try {
    const [[sent]]     = await pool.query('SELECT COUNT(*) AS c FROM kudos WHERE from_user_id = ?', [req.uid])
    const [[received]] = await pool.query('SELECT COUNT(*) AS c FROM kudos WHERE to_user_id = ?', [req.uid])
    const [[userRow]]  = await pool.query('SELECT hire_date FROM users WHERE id = ?', [req.uid])
    let tenureYears = null
    if (userRow?.hire_date) {
      const hd = new Date(userRow.hire_date)
      tenureYears = new Date().getUTCFullYear() - hd.getUTCFullYear()
    }
    res.json({ kudosSent: Number(sent.c), kudosReceived: Number(received.c), tenureYears })
  } catch (err) { next(err) }
})

// GET /users/directory — lista básica de usuários ativos (para seletor de destinatário em kudos, etc.)
router.get('/directory', requireAuth, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, photo_url FROM users WHERE is_active = 1 ORDER BY COALESCE(name, email)'
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /users/presence — usuários ativos agora (público, info básica sem e-mail)
router.get('/presence', requireAuth, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, photo_url, status
      FROM users
      WHERE is_active = 1
        AND last_heartbeat >= DATE_SUB(NOW(), INTERVAL 2 MINUTE)
      ORDER BY name
      LIMIT 50
    `)
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /users/celebrations — aniversários e datas de empresa de hoje
router.get('/celebrations', requireAuth, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, photo_url, birth_date, hire_date
      FROM users
      WHERE is_active = 1
        AND (
          (birth_date IS NOT NULL AND MONTH(birth_date) = MONTH(CURDATE()) AND DAY(birth_date) = DAY(CURDATE()))
          OR
          (hire_date IS NOT NULL
            AND hire_date < CURDATE()
            AND MONTH(hire_date) = MONTH(CURDATE())
            AND DAY(hire_date)   = DAY(CURDATE()))
        )
      ORDER BY name
    `)

    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1 // 1-based
    const currentDay   = new Date().getDate()

    const result = rows.map((r) => {
      let isBirthday    = false
      let isAnniversary = false
      let anniversaryYears = null

      if (r.birth_date) {
        const bd = new Date(r.birth_date)
        isBirthday = (bd.getUTCMonth() + 1) === currentMonth && bd.getUTCDate() === currentDay
      }
      if (r.hire_date) {
        const hd = new Date(r.hire_date)
        isAnniversary = (hd.getUTCMonth() + 1) === currentMonth && hd.getUTCDate() === currentDay
        if (isAnniversary) {
          anniversaryYears = currentYear - hd.getUTCFullYear()
        }
      }

      return {
        id:              r.id,
        name:            r.name,
        photoUrl:        r.photo_url,
        isBirthday,
        isAnniversary,
        anniversaryYears,
      }
    })

    res.json(result)
  } catch (err) { next(err) }
})

// GET /users/:id/public — perfil público de um colega (sem e-mail, sem is_admin)
// ⚠️ deve ficar ANTES de PATCH /:id para que Express não confunda o segmento
router.get('/:id/public', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.photo_url, u.profile, u.status,
             t.name AS team_name,
             u.birth_date, u.hire_date,
             COALESCE(kc.kudo_count, 0) AS kudo_count
      FROM users u
      LEFT JOIN teams t ON t.id = u.team
      LEFT JOIN (
        SELECT to_user_id, COUNT(*) AS kudo_count FROM kudos GROUP BY to_user_id
      ) kc ON kc.to_user_id = u.id
      WHERE u.id = ? AND u.is_active = 1
    `, [req.params.id])

    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' })
    const r = rows[0]

    const today        = new Date()
    const currentMonth = today.getUTCMonth() + 1
    const currentDay   = today.getUTCDate()
    const currentYear  = today.getUTCFullYear()

    let birthdayToday = false, birthdayThisMonth = false
    let birthMonth = null, birthDay = null, tenureYears = null

    if (r.birth_date) {
      const parts = String(r.birth_date).split('-')
      birthMonth = Number(parts[1])
      birthDay   = Number(parts[2])
      birthdayToday     = birthMonth === currentMonth && birthDay === currentDay
      birthdayThisMonth = birthMonth === currentMonth
    }
    if (r.hire_date) {
      const hd    = new Date(r.hire_date)
      const years = currentYear - hd.getUTCFullYear()
      if (years >= 1) tenureYears = years
    }

    res.json({
      id: r.id, name: r.name, photoUrl: r.photo_url,
      profile: r.profile, status: r.status, teamName: r.team_name,
      kudoCount: Number(r.kudo_count),
      birthMonth, birthDay, birthdayToday, birthdayThisMonth, tenureYears,
    })
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

  const allowed = ['is_active', 'is_admin', 'profile', 'team', 'permissions', 'hire_date']
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
    `SELECT ${USER_FIELDS} FROM ${USER_FROM} WHERE u.id = ?`,
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

  const [rows] = await pool.query(`SELECT ${USER_FIELDS} FROM ${USER_FROM} WHERE u.id = ?`, [firebaseUid])
  res.status(201).json(rows[0])
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
