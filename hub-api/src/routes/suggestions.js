const router = require('express').Router()
const pool   = require('../db/pool')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { adminWriteLimiter }         = require('../middleware/rateLimits')
const { randomUUID }                = require('crypto')
const logAudit                      = require('../utils/logAudit')
const AUDIT_ACTIONS                 = require('../utils/auditActions')

const VALID_TYPES    = ['feature', 'bug', 'improvement', 'other']
const VALID_STATUSES = ['pending', 'in_review', 'done', 'rejected']

// Aggregated SELECT: suggestion row + vote tallies + current user's vote + comment count.
// First `?` placeholder is the current user's id (for my_vote); caller appends WHERE params.
function listQuery(whereClause) {
  return `
    SELECT
      s.*,
      COALESCE(v.up_count, 0)      AS up_count,
      COALESCE(v.down_count, 0)    AS down_count,
      COALESCE(v.score, 0)         AS score,
      v.up_voter_names             AS up_voter_names,
      COALESCE(c.comment_count, 0) AS comment_count,
      mv.value                     AS my_vote
    FROM suggestions s
    LEFT JOIN (
      SELECT suggestion_id,
        SUM(CASE WHEN value = 1  THEN 1 ELSE 0 END) AS up_count,
        SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END) AS down_count,
        SUM(value)                                  AS score,
        GROUP_CONCAT(CASE WHEN value = 1 THEN user_name END ORDER BY created_at DESC SEPARATOR '||') AS up_voter_names
      FROM suggestion_votes GROUP BY suggestion_id
    ) v ON v.suggestion_id = s.id
    LEFT JOIN (
      SELECT suggestion_id, COUNT(*) AS comment_count
      FROM suggestion_comments GROUP BY suggestion_id
    ) c ON c.suggestion_id = s.id
    LEFT JOIN suggestion_votes mv ON mv.suggestion_id = s.id AND mv.user_id = ?
    ${whereClause}
    ORDER BY s.created_at DESC
  `
}

async function fetchActiveUser(uid) {
  const [rows] = await pool.query('SELECT name, is_active FROM users WHERE id = ?', [uid])
  if (!rows.length || !rows[0].is_active) return null
  return rows[0]
}

// GET /suggestions — feed da comunidade (todas as sugestões + engajamento do usuário)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(listQuery(''), [req.uid])
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// GET /suggestions/all — admin: todas as sugestões (mesmo payload enriquecido)
router.get('/all', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [rows] = await pool.query(listQuery(''), [req.uid])
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// POST /suggestions — usuário: criar sugestão
router.post('/', requireAuth, async (req, res, next) => {
  const user = await fetchActiveUser(req.uid)
  if (!user) return res.status(403).json({ error: 'Usuário inativo' })

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
      [id, appId || null, appName || null, req.uid, user.name, title.trim(), body?.trim() || null, suggType],
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

  const [rows] = await pool.query(listQuery('WHERE s.id = ?'), [req.uid, id])
  res.status(201).json(rows[0])
})

// POST /suggestions/:id/vote — apoiar (1), não apoiar (-1) ou remover (0)
router.post('/:id/vote', requireAuth, async (req, res, next) => {
  const user = await fetchActiveUser(req.uid)
  if (!user) return res.status(403).json({ error: 'Usuário inativo' })

  const value = Number(req.body?.value)
  if (![1, -1, 0].includes(value)) {
    return res.status(400).json({ error: 'value inválido. Use 1, -1 ou 0.' })
  }

  const [exists] = await pool.query('SELECT id FROM suggestions WHERE id = ?', [req.params.id])
  if (!exists.length) return res.status(404).json({ error: 'Sugestão não encontrada' })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    if (value === 0) {
      await conn.query('DELETE FROM suggestion_votes WHERE suggestion_id = ? AND user_id = ?', [req.params.id, req.uid])
    } else {
      await conn.query(
        `INSERT INTO suggestion_votes (suggestion_id, user_id, user_name, value)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value), created_at = CURRENT_TIMESTAMP`,
        [req.params.id, req.uid, user.name, value],
      )
    }
    await logAudit({
      uid: req.uid, action: AUDIT_ACTIONS.SUGGESTION_VOTE,
      details: { id: req.params.id, value }, req, conn,
    })
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    return next(err)
  } finally {
    conn.release()
  }

  const [rows] = await pool.query(listQuery('WHERE s.id = ?'), [req.uid, req.params.id])
  res.json(rows[0])
})

// GET /suggestions/:id/comments — lista de comentários
router.get('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM suggestion_comments WHERE suggestion_id = ? ORDER BY created_at ASC',
      [req.params.id],
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// POST /suggestions/:id/comments — adicionar comentário
router.post('/:id/comments', requireAuth, async (req, res, next) => {
  const user = await fetchActiveUser(req.uid)
  if (!user) return res.status(403).json({ error: 'Usuário inativo' })

  const body = req.body?.body?.trim()
  if (!body) return res.status(400).json({ error: 'body obrigatório' })
  if (body.length > 2000) return res.status(400).json({ error: 'Comentário muito longo (máx. 2000)' })

  const [exists] = await pool.query('SELECT id FROM suggestions WHERE id = ?', [req.params.id])
  if (!exists.length) return res.status(404).json({ error: 'Sugestão não encontrada' })

  const id = randomUUID()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query(
      'INSERT INTO suggestion_comments (id, suggestion_id, user_id, user_name, body) VALUES (?, ?, ?, ?, ?)',
      [id, req.params.id, req.uid, user.name, body],
    )
    await logAudit({
      uid: req.uid, action: AUDIT_ACTIONS.SUGGESTION_COMMENT,
      details: { id, suggestionId: req.params.id }, req, conn,
    })
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    return next(err)
  } finally {
    conn.release()
  }

  const [rows] = await pool.query('SELECT * FROM suggestion_comments WHERE id = ?', [id])
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
      [status, adminNote?.trim() || null, req.params.id],
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

  const [rows] = await pool.query(listQuery('WHERE s.id = ?'), [req.uid, req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Sugestão não encontrada' })
  res.json(rows[0])
})

module.exports = router
