const router = require('express').Router()
const pool   = require('../db/pool')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { boardLimiter } = require('../middleware/rateLimits')
const { stripHtml } = require('../utils/sanitize')
const { randomUUID } = require('crypto')

// ─── Campos comuns ────────────────────────────────────────────────────────────

const SELECT_POSTS = `
  SELECT bp.id, bp.message, bp.pinned, bp.created_at,
         u.id AS user_id, u.name AS user_name, u.photo_url AS user_photo
  FROM board_posts bp
  JOIN users u ON u.id = bp.user_id
`

// GET /board — lista posts (fixados primeiro, depois mais recentes)
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      ${SELECT_POSTS}
      ORDER BY bp.pinned DESC, bp.created_at DESC
      LIMIT 30
    `)
    res.json(rows.map(r => ({
      id:        r.id,
      message:   r.message,
      pinned:    !!r.pinned,
      createdAt: r.created_at,
      author:    { id: r.user_id, name: r.user_name, photoUrl: r.user_photo },
    })))
  } catch (err) { next(err) }
})

// POST /board — criar post
router.post('/', requireAuth, boardLimiter, async (req, res, next) => {
  const { message } = req.body
  const trimmed = stripHtml(message, 500)
  if (!trimmed) {
    return res.status(400).json({ error: 'message obrigatório (máx 500 caracteres)' })
  }

  try {
    const id = randomUUID()
    await pool.query(
      'INSERT INTO board_posts (id, user_id, message) VALUES (?, ?, ?)',
      [id, req.uid, trimmed]
    )
    const [[row]] = await pool.query(`${SELECT_POSTS} WHERE bp.id = ?`, [id])
    res.status(201).json({
      id: row.id, message: row.message, pinned: false, createdAt: row.created_at,
      author: { id: row.user_id, name: row.user_name, photoUrl: row.user_photo },
    })
  } catch (err) { next(err) }
})

// DELETE /board/:id — deletar post (autor ou admin)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const [[post]] = await pool.query('SELECT user_id FROM board_posts WHERE id = ?', [req.params.id])
    if (!post) return res.status(404).json({ error: 'Post não encontrado' })

    // Verifica se é o autor; admin pode deletar qualquer um
    const isAdmin = req.isAdmin === true || req.user?.isAdmin === true
    if (post.user_id !== req.uid && !isAdmin) {
      // Busca is_admin no DB como fallback
      const [[u]] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.uid])
      if (!u?.is_admin) return res.status(403).json({ error: 'Sem permissão para deletar este post' })
    }

    await pool.query('DELETE FROM board_posts WHERE id = ?', [req.params.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// PATCH /board/:id/pin — fixar/desafixar post (admin only)
router.patch('/:id/pin', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [[post]] = await pool.query('SELECT id, pinned FROM board_posts WHERE id = ?', [req.params.id])
    if (!post) return res.status(404).json({ error: 'Post não encontrado' })
    const newPinned = post.pinned ? 0 : 1
    await pool.query('UPDATE board_posts SET pinned = ? WHERE id = ?', [newPinned, req.params.id])
    res.json({ ok: true, pinned: !!newPinned })
  } catch (err) { next(err) }
})

module.exports = router
