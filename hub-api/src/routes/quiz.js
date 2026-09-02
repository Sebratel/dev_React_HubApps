/**
 * Quiz do Dia — rotas
 * GET  /quiz/today          → perguntas de hoje (sem gabarito) ou resultado se já jogou
 * POST /quiz/submit         → envia respostas, recebe pontuação
 * GET  /quiz/ranking        → ranking semanal
 * GET  /quiz/questions      → admin: lista todas as perguntas
 * POST /quiz/questions      → admin: adiciona pergunta
 * DELETE /quiz/questions/:id → admin: desativa pergunta
 */
const express = require('express')
const router  = express.Router()

// ── Seeded random (Mulberry32) ────────────────────────────────────────────────

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5) | 0
    t = Math.imul(t ^ (t >>> 15), 1 | t)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Semente baseada na data de Brasília (UTC-3) */
function todaySeed() {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate()
}

/** Data atual em Brasília no formato YYYY-MM-DD */
function todayDate() {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Seleciona 5 perguntas do dia de forma determinística por data */
function selectTodaysQuestions(all, n = 5) {
  const rand     = mulberry32(todaySeed())
  const shuffled = [...all].sort(() => rand() - 0.5)
  return shuffled.slice(0, n)
}

// ── GET /quiz/today ───────────────────────────────────────────────────────────

router.get('/today', async (req, res) => {
  const { pool } = req.app.locals
  const userId   = req.user?.uid

  if (!userId) return res.status(401).json({ error: 'Não autenticado.' })

  let conn
  try {
    conn = await pool.getConnection()
    const today = todayDate()

    // Já jogou hoje?
    const [[attempt]] = await conn.query(
      'SELECT * FROM quiz_attempts WHERE user_id = ? AND played_date = ?',
      [userId, today]
    )

    if (attempt) {
      const answers   = JSON.parse(attempt.answers)
      const ids       = answers.map(a => a.questionId)
      if (!ids.length) return res.json({ status: 'played', score: attempt.score, answers: [] })

      const placeholders = ids.map(() => '?').join(',')
      const [questions]  = await conn.query(
        `SELECT * FROM quiz_questions WHERE id IN (${placeholders})`,
        ids
      )
      const qMap = Object.fromEntries(questions.map(q => [q.id, q]))
      return res.json({
        status: 'played',
        score:  attempt.score,
        answers: answers.map(a => ({
          ...a,
          correctAnswer: qMap[a.questionId]?.correct,
          question:      qMap[a.questionId]?.question,
          options: {
            a: qMap[a.questionId]?.option_a,
            b: qMap[a.questionId]?.option_b,
            c: qMap[a.questionId]?.option_c,
            d: qMap[a.questionId]?.option_d,
          },
        })),
      })
    }

    // Busca perguntas ativas
    const [all] = await conn.query(
      'SELECT * FROM quiz_questions WHERE active = 1 ORDER BY id'
    )

    if (all.length < 5) {
      return res.status(503).json({ error: 'Perguntas insuficientes no banco.' })
    }

    const selected = selectTodaysQuestions(all)

    res.json({
      status: 'pending',
      date:   today,
      questions: selected.map(q => ({
        id:       q.id,
        question: q.question,
        options:  { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d },
        category: q.category,
      })),
    })
  } catch (err) {
    console.error('[quiz/today]', err)
    res.status(500).json({ error: 'Erro interno.' })
  } finally {
    conn?.release()
  }
})

// ── POST /quiz/submit ─────────────────────────────────────────────────────────

router.post('/submit', async (req, res) => {
  const { pool } = req.app.locals
  const userId   = req.user?.uid
  const today    = todayDate()

  if (!userId) return res.status(401).json({ error: 'Não autenticado.' })

  let conn
  try {
    conn = await pool.getConnection()

    // Evita submissão dupla
    const [[existing]] = await conn.query(
      'SELECT id FROM quiz_attempts WHERE user_id = ? AND played_date = ?',
      [userId, today]
    )
    if (existing) {
      return res.status(409).json({ error: 'Você já jogou hoje. Volte amanhã!' })
    }

    const { answers } = req.body // [{ questionId, chosen, timeMs }]
    if (!Array.isArray(answers) || answers.length !== 5) {
      return res.status(400).json({ error: 'Envie exatamente 5 respostas.' })
    }

    // Valida que os questionIds correspondem ao quiz de hoje
    const [all]        = await conn.query('SELECT * FROM quiz_questions WHERE active = 1 ORDER BY id')
    const todaysQs     = selectTodaysQuestions(all)
    const todaysIds    = new Set(todaysQs.map(q => q.id))

    if (!answers.every(a => todaysIds.has(a.questionId))) {
      return res.status(400).json({ error: 'Perguntas inválidas para hoje.' })
    }

    // Calcula pontuação
    const TIME_LIMIT_MS = 15_000
    let   score         = 0

    const fullAnswers = answers.map(ans => {
      const q         = todaysQs.find(q => q.id === ans.questionId)
      const correct   = q?.correct ?? null
      const isCorrect = ans.chosen && ans.chosen === correct
      const timeMs    = Math.min(Math.max(0, Number(ans.timeMs) || TIME_LIMIT_MS), TIME_LIMIT_MS)
      const timeBonus = isCorrect ? Math.round((TIME_LIMIT_MS - timeMs) / TIME_LIMIT_MS * 100) : 0
      const pts       = isCorrect ? 100 + timeBonus : 0
      score += pts
      return { questionId: ans.questionId, chosen: ans.chosen || null, correct, timeMs, pts }
    })

    await conn.query(
      'INSERT INTO quiz_attempts (user_id, played_date, score, answers) VALUES (?, ?, ?, ?)',
      [userId, today, score, JSON.stringify(fullAnswers)]
    )

    const qMap = Object.fromEntries(todaysQs.map(q => [q.id, q]))
    res.json({
      score,
      answers: fullAnswers.map(a => ({
        ...a,
        question: qMap[a.questionId]?.question,
        options: {
          a: qMap[a.questionId]?.option_a,
          b: qMap[a.questionId]?.option_b,
          c: qMap[a.questionId]?.option_c,
          d: qMap[a.questionId]?.option_d,
        },
      })),
    })
  } catch (err) {
    console.error('[quiz/submit]', err)
    res.status(500).json({ error: 'Erro interno.' })
  } finally {
    conn?.release()
  }
})

// ── GET /quiz/ranking ─────────────────────────────────────────────────────────

router.get('/ranking', async (req, res) => {
  const { pool } = req.app.locals
  const userId   = req.user?.uid

  if (!userId) return res.status(401).json({ error: 'Não autenticado.' })

  let conn
  try {
    conn = await pool.getConnection()

    // Início da semana (segunda-feira) em Brasília
    const now      = new Date(Date.now() - 3 * 60 * 60 * 1000)
    const day      = now.getUTCDay() // 0 = Dom
    const weekStart = new Date(now)
    weekStart.setUTCDate(now.getUTCDate() - (day === 0 ? 6 : day - 1))
    weekStart.setUTCHours(0, 0, 0, 0)
    const weekStartDate = weekStart.toISOString().slice(0, 10)

    const [weekly] = await conn.query(`
      SELECT a.user_id, u.name, u.photo_url,
             SUM(a.score) AS total_score,
             COUNT(*)     AS days_played
        FROM quiz_attempts a
        LEFT JOIN users u ON u.id = a.user_id
       WHERE a.played_date >= ?
       GROUP BY a.user_id
       ORDER BY total_score DESC
       LIMIT 20
    `, [weekStartDate])

    const today            = todayDate()
    const [[todayAttempt]] = await conn.query(
      'SELECT score FROM quiz_attempts WHERE user_id = ? AND played_date = ?',
      [userId, today]
    )

    const myRow      = weekly.findIndex(r => r.user_id === userId)
    const myWeekRow  = weekly.find(r => r.user_id === userId)

    res.json({
      weekly: weekly.map((r, i) => ({
        position:    i + 1,
        userId:      r.user_id,
        name:        r.name   ?? 'Usuário',
        photoUrl:    r.photo_url ?? null,
        totalScore:  r.total_score,
        daysPlayed:  r.days_played,
      })),
      myPosition:      myRow >= 0 ? myRow + 1 : null,
      myWeeklyScore:   myWeekRow?.total_score ?? 0,
      todayScore:      todayAttempt?.score    ?? null,
      weekStartDate,
    })
  } catch (err) {
    console.error('[quiz/ranking]', err)
    res.status(500).json({ error: 'Erro interno.' })
  } finally {
    conn?.release()
  }
})

// ── Admin: GET /quiz/questions ────────────────────────────────────────────────

router.get('/questions', async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Proibido.' })
  const { pool } = req.app.locals
  let conn
  try {
    conn = await pool.getConnection()
    const [rows] = await conn.query('SELECT * FROM quiz_questions ORDER BY id DESC')
    res.json(rows)
  } catch (err) {
    console.error('[quiz/questions GET]', err)
    res.status(500).json({ error: 'Erro interno.' })
  } finally {
    conn?.release()
  }
})

// ── Admin: POST /quiz/questions ───────────────────────────────────────────────

router.post('/questions', async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Proibido.' })
  const { pool } = req.app.locals
  const { question, option_a, option_b, option_c, option_d, correct, category, difficulty } = req.body

  if (!question || !option_a || !option_b || !option_c || !option_d
      || !['a', 'b', 'c', 'd'].includes(correct)) {
    return res.status(400).json({ error: 'Dados inválidos.' })
  }

  let conn
  try {
    conn = await pool.getConnection()
    const [result] = await conn.query(
      `INSERT INTO quiz_questions
        (question, option_a, option_b, option_c, option_d, correct, category, difficulty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [question, option_a, option_b, option_c, option_d, correct,
       category || 'geral', difficulty || 'facil']
    )
    res.status(201).json({ id: result.insertId })
  } catch (err) {
    console.error('[quiz/questions POST]', err)
    res.status(500).json({ error: 'Erro interno.' })
  } finally {
    conn?.release()
  }
})

// ── Admin: DELETE /quiz/questions/:id ─────────────────────────────────────────

router.delete('/questions/:id', async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Proibido.' })
  const { pool } = req.app.locals
  let conn
  try {
    conn = await pool.getConnection()
    await conn.query('UPDATE quiz_questions SET active = 0 WHERE id = ?', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('[quiz/questions DELETE]', err)
    res.status(500).json({ error: 'Erro interno.' })
  } finally {
    conn?.release()
  }
})

module.exports = router
