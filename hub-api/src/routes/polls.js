const router     = require('express').Router()
const pool       = require('../db/pool')
const { requireAuth } = require('../middleware/auth')
const { pollCreateLimiter, pollVoteLimiter } = require('../middleware/rateLimits')
const { randomUUID }  = require('crypto')

// GET /polls — enquetes abertas com contagens e voto do usuário
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [polls] = await pool.query(`
      SELECT p.id, p.question, p.created_at, p.closes_at,
             u.id AS creator_id, u.name AS creator_name, u.photo_url AS creator_photo
      FROM polls p
      JOIN users u ON u.id = p.created_by
      WHERE p.is_active = 1
        AND (p.closes_at IS NULL OR p.closes_at > NOW())
      ORDER BY p.created_at DESC
      LIMIT 10
    `)

    if (!polls.length) return res.json([])

    const pollIds = polls.map(p => p.id)

    // Opções com contagem de votos
    const [options] = await pool.query(`
      SELECT po.id, po.poll_id, po.text, po.display_order,
             COUNT(pv.option_id) AS vote_count
      FROM poll_options po
      LEFT JOIN poll_votes pv ON pv.option_id = po.id
      WHERE po.poll_id IN (?)
      GROUP BY po.id, po.poll_id, po.text, po.display_order
      ORDER BY po.display_order
    `, [pollIds])

    // Voto atual do usuário em cada enquete
    const [myVotes] = await pool.query(`
      SELECT poll_id, option_id
      FROM poll_votes
      WHERE poll_id IN (?) AND user_id = ?
    `, [pollIds, req.uid])

    const myVoteMap = Object.fromEntries(myVotes.map(v => [v.poll_id, v.option_id]))

    const result = polls.map(p => {
      const pollOptions = options.filter(o => o.poll_id === p.id)
      const totalVotes  = pollOptions.reduce((s, o) => s + Number(o.vote_count), 0)
      return {
        id:        p.id,
        question:  p.question,
        createdAt: p.created_at,
        closesAt:  p.closes_at,
        creator:   { id: p.creator_id, name: p.creator_name, photoUrl: p.creator_photo },
        myVote:    myVoteMap[p.id] ?? null,
        totalVotes,
        options: pollOptions.map(o => ({
          id:        o.id,
          text:      o.text,
          voteCount: Number(o.vote_count),
          percent:   totalVotes > 0 ? Math.round((Number(o.vote_count) / totalVotes) * 100) : 0,
        })),
      }
    })

    res.json(result)
  } catch (err) { next(err) }
})

// POST /polls — criar enquete
router.post('/', requireAuth, pollCreateLimiter, async (req, res, next) => {
  const { question, options, closesAt } = req.body

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question obrigatório' })
  }
  if (!Array.isArray(options) || options.length < 2 || options.length > 4) {
    return res.status(400).json({ error: 'options deve ter entre 2 e 4 itens' })
  }
  const texts = options.map(o => (typeof o === 'string' ? o : o?.text ?? '').trim())
  if (texts.some(t => !t || t.length > 200)) {
    return res.status(400).json({ error: 'Cada opção deve ter entre 1 e 200 caracteres' })
  }

  // Limita 1 enquete ativa por usuário
  const [[existing]] = await pool.query(`
    SELECT id FROM polls
    WHERE created_by = ? AND is_active = 1
      AND (closes_at IS NULL OR closes_at > NOW())
    LIMIT 1
  `, [req.uid])

  if (existing) {
    return res.status(409).json({ error: 'Você já tem uma enquete ativa. Encerre-a antes de criar outra.' })
  }

  const pollId = randomUUID()
  let parsedClosesAt = null
  if (closesAt) {
    parsedClosesAt = new Date(closesAt)
    if (isNaN(parsedClosesAt.getTime()) || parsedClosesAt <= new Date()) {
      return res.status(400).json({ error: 'closesAt deve ser uma data futura válida' })
    }
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query(
      'INSERT INTO polls (id, question, created_by, closes_at) VALUES (?, ?, ?, ?)',
      [pollId, question.trim().slice(0, 200), req.uid, parsedClosesAt]
    )
    for (let i = 0; i < texts.length; i++) {
      await conn.query(
        'INSERT INTO poll_options (id, poll_id, text, display_order) VALUES (?, ?, ?, ?)',
        [randomUUID(), pollId, texts[i], i]
      )
    }
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    return next(err)
  } finally {
    conn.release()
  }

  res.status(201).json({ id: pollId, ok: true })
})

// POST /polls/:id/vote — votar (ou trocar voto)
router.post('/:id/vote', requireAuth, pollVoteLimiter, async (req, res, next) => {
  const { optionId } = req.body
  if (!optionId) return res.status(400).json({ error: 'optionId obrigatório' })

  try {
    // Verifica que a enquete e a opção existem e estão abertas
    const [[poll]] = await pool.query(`
      SELECT id FROM polls
      WHERE id = ? AND is_active = 1
        AND (closes_at IS NULL OR closes_at > NOW())
    `, [req.params.id])
    if (!poll) return res.status(404).json({ error: 'Enquete não encontrada ou encerrada' })

    const [[opt]] = await pool.query(
      'SELECT id FROM poll_options WHERE id = ? AND poll_id = ?',
      [optionId, req.params.id]
    )
    if (!opt) return res.status(400).json({ error: 'Opção inválida' })

    // INSERT … ON DUPLICATE KEY UPDATE (troca voto se já votou)
    await pool.query(`
      INSERT INTO poll_votes (poll_id, user_id, option_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE option_id = VALUES(option_id), voted_at = NOW()
    `, [req.params.id, req.uid, optionId])

    res.json({ ok: true })
  } catch (err) { next(err) }
})

// PATCH /polls/:id — encerrar enquete (só o criador)
router.patch('/:id', requireAuth, async (req, res, next) => {
  const { isActive } = req.body
  if (isActive !== false) return res.status(400).json({ error: 'Só é possível encerrar (isActive: false)' })

  try {
    const [[poll]] = await pool.query(
      'SELECT created_by FROM polls WHERE id = ?',
      [req.params.id]
    )
    if (!poll) return res.status(404).json({ error: 'Enquete não encontrada' })
    if (poll.created_by !== req.uid) {
      return res.status(403).json({ error: 'Só o criador pode encerrar esta enquete' })
    }
    await pool.query('UPDATE polls SET is_active = 0 WHERE id = ?', [req.params.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

module.exports = router
