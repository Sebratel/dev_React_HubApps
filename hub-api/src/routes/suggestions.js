const router = require('express').Router()
const pool   = require('../db/pool')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { adminWriteLimiter }         = require('../middleware/rateLimits')
const logAudit                      = require('../utils/logAudit')
const AUDIT_ACTIONS                 = require('../utils/auditActions')
const {
  listQuery,
  mapSuggestionRow,
  mapCommentRow,
  typeToCategory,
  hubToLegacyStatus,
  valueToVoteType,
  refreshCounts,
} = require('../utils/platformSuggestions')

const VALID_TYPES    = ['feature', 'bug', 'improvement', 'other']
const VALID_STATUSES = ['pending', 'in_review', 'done', 'rejected']

async function fetchActiveUser(uid) {
  const [rows] = await pool.query(
    'SELECT name, email, photo_url, is_active FROM users WHERE id = ?',
    [uid],
  )
  if (!rows.length || !rows[0].is_active) return null
  return rows[0]
}

async function fetchSuggestionById(uid, id) {
  const [rows] = await pool.query(listQuery('WHERE s.id = ?'), [uid, id])
  return rows.length ? mapSuggestionRow(rows[0]) : null
}

async function resolveApp(appId, appName) {
  if (appId) {
    const [rows] = await pool.query(
      'SELECT id, name FROM apps WHERE id = ? AND is_active = 1',
      [appId],
    )
    if (!rows.length) return { error: 'App inválido ou inativo' }
    return { appId: rows[0].id, appName: rows[0].name }
  }

  if (appName?.trim()) {
    const [rows] = await pool.query(
      'SELECT id, name FROM apps WHERE name = ? AND is_active = 1',
      [appName.trim()],
    )
    if (rows.length) return { appId: rows[0].id, appName: rows[0].name }
    return { appId: null, appName: appName.trim() }
  }

  return { appId: null, appName: null }
}

function listFilterClause(appId) {
  if (!appId) return { clause: '', params: [] }
  return { clause: 'WHERE s.app_id = ?', params: [appId] }
}

// GET /suggestions — feed da comunidade (tabelas legadas platform_*)
// Query opcional: ?appId=app-splitters-sebratel
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { clause, params } = listFilterClause(req.query.appId)
    const [rows] = await pool.query(listQuery(clause), [req.uid, ...params])
    res.json(rows.map(mapSuggestionRow))
  } catch (err) {
    next(err)
  }
})

// GET /suggestions/all — admin
router.get('/all', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { clause, params } = listFilterClause(req.query.appId)
    const [rows] = await pool.query(listQuery(clause), [req.uid, ...params])
    res.json(rows.map(mapSuggestionRow))
  } catch (err) {
    next(err)
  }
})

// POST /suggestions — criar sugestão (visível também na plataforma de splitters)
router.post('/', requireAuth, async (req, res, next) => {
  const user = await fetchActiveUser(req.uid)
  if (!user) return res.status(403).json({ error: 'Usuário inativo' })

  const { title, body, type, appId, appName } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'title obrigatório' })

  const resolved = await resolveApp(appId, appName)
  if (resolved.error) return res.status(400).json({ error: resolved.error })

  const suggType = VALID_TYPES.includes(type) ? type : 'other'
  const sector   = resolved.appName || 'Hub Geral'
  const category = typeToCategory(suggType)
  const description = body?.trim() || title.trim()

  const conn = await pool.getConnection()
  let newId
  try {
    await conn.beginTransaction()
    const [result] = await conn.query(
      `INSERT INTO platform_suggestions
         (title, description, sector, app_id, category, status,
          author_uid, author_email, author_name, author_photo_url)
       VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)`,
      [
        title.trim(),
        description,
        sector,
        resolved.appId,
        category,
        req.uid,
        user.email || '',
        user.name,
        user.photo_url || null,
      ],
    )
    newId = result.insertId

    await logAudit({
      uid: req.uid,
      action: AUDIT_ACTIONS.SUGGESTION_CREATE,
      details: { id: newId, title: title.trim(), appId: resolved.appId, sector },
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

  const row = await fetchSuggestionById(req.uid, newId)
  res.status(201).json(row)
})

// POST /suggestions/:id/vote
router.post('/:id/vote', requireAuth, async (req, res, next) => {
  const user = await fetchActiveUser(req.uid)
  if (!user) return res.status(403).json({ error: 'Usuário inativo' })

  const value = Number(req.body?.value)
  if (![1, -1, 0].includes(value)) {
    return res.status(400).json({ error: 'value inválido. Use 1, -1 ou 0.' })
  }

  const suggestionId = Number(req.params.id)
  if (!Number.isFinite(suggestionId)) {
    return res.status(400).json({ error: 'ID de sugestão inválido' })
  }

  const [exists] = await pool.query('SELECT id FROM platform_suggestions WHERE id = ?', [suggestionId])
  if (!exists.length) return res.status(404).json({ error: 'Sugestão não encontrada' })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    if (value === 0) {
      await conn.query(
        'DELETE FROM platform_suggestion_votes WHERE suggestion_id = ? AND user_uid = ?',
        [suggestionId, req.uid],
      )
    } else {
      const voteType = valueToVoteType(value)
      await conn.query(
        `INSERT INTO platform_suggestion_votes
           (suggestion_id, user_uid, user_email, user_name, user_photo_url, vote_type)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           vote_type = VALUES(vote_type),
           user_name = VALUES(user_name),
           user_email = VALUES(user_email),
           user_photo_url = VALUES(user_photo_url),
           updated_at = CURRENT_TIMESTAMP`,
        [suggestionId, req.uid, user.email || '', user.name, user.photo_url || null, voteType],
      )
    }
    await refreshCounts(conn, suggestionId)
    await logAudit({
      uid: req.uid,
      action: AUDIT_ACTIONS.SUGGESTION_VOTE,
      details: { id: suggestionId, value },
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

  const row = await fetchSuggestionById(req.uid, suggestionId)
  res.json(row)
})

// GET /suggestions/:id/comments
router.get('/:id/comments', requireAuth, async (req, res, next) => {
  const suggestionId = Number(req.params.id)
  if (!Number.isFinite(suggestionId)) {
    return res.status(400).json({ error: 'ID de sugestão inválido' })
  }

  try {
    const [rows] = await pool.query(
      `SELECT * FROM platform_suggestion_comments
       WHERE suggestion_id = ?
       ORDER BY created_at ASC`,
      [suggestionId],
    )
    res.json(rows.map(mapCommentRow))
  } catch (err) {
    next(err)
  }
})

// POST /suggestions/:id/comments
router.post('/:id/comments', requireAuth, async (req, res, next) => {
  const user = await fetchActiveUser(req.uid)
  if (!user) return res.status(403).json({ error: 'Usuário inativo' })

  const body = req.body?.body?.trim()
  if (!body) return res.status(400).json({ error: 'body obrigatório' })
  if (body.length > 2000) return res.status(400).json({ error: 'Comentário muito longo (máx. 2000)' })

  const suggestionId = Number(req.params.id)
  if (!Number.isFinite(suggestionId)) {
    return res.status(400).json({ error: 'ID de sugestão inválido' })
  }

  const [exists] = await pool.query('SELECT id FROM platform_suggestions WHERE id = ?', [suggestionId])
  if (!exists.length) return res.status(404).json({ error: 'Sugestão não encontrada' })

  const conn = await pool.getConnection()
  let newId
  try {
    await conn.beginTransaction()
    const [result] = await conn.query(
      `INSERT INTO platform_suggestion_comments
         (suggestion_id, author_uid, author_email, author_name, author_photo_url, message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [suggestionId, req.uid, user.email || '', user.name, user.photo_url || null, body],
    )
    newId = result.insertId
    await refreshCounts(conn, suggestionId)
    await logAudit({
      uid: req.uid,
      action: AUDIT_ACTIONS.SUGGESTION_COMMENT,
      details: { id: newId, suggestionId },
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

  const [rows] = await pool.query('SELECT * FROM platform_suggestion_comments WHERE id = ?', [newId])
  res.status(201).json(mapCommentRow(rows[0]))
})

// PATCH /suggestions/:id/status — admin
router.patch('/:id/status', requireAuth, requireAdmin, adminWriteLimiter, async (req, res, next) => {
  const { status, adminNote } = req.body
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status inválido. Use: ${VALID_STATUSES.join(', ')}` })
  }

  const suggestionId = Number(req.params.id)
  if (!Number.isFinite(suggestionId)) {
    return res.status(400).json({ error: 'ID de sugestão inválido' })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [result] = await conn.query(
      'UPDATE platform_suggestions SET status = ? WHERE id = ?',
      [hubToLegacyStatus(status), suggestionId],
    )
    if (!result.affectedRows) {
      await conn.rollback()
      return res.status(404).json({ error: 'Sugestão não encontrada' })
    }
    await logAudit({
      uid: req.uid,
      action: AUDIT_ACTIONS.SUGGESTION_STATUS_UPDATE,
      details: { id: suggestionId, status, adminNote: adminNote?.trim() || null },
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

  const row = await fetchSuggestionById(req.uid, suggestionId)
  if (!row) return res.status(404).json({ error: 'Sugestão não encontrada' })
  if (adminNote?.trim()) row.admin_note = adminNote.trim()
  res.json(row)
})

module.exports = router
