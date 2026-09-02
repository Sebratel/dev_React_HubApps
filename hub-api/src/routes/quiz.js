/**
 * Quiz da Semana — rotas
 *
 * Ciclo: perguntas mudam toda segunda-feira (seed semanal).
 *        Cada usuário joga uma vez por semana.
 *        Ranking mensal acumula as jogadas da semana até o fim do mês.
 *        Histórico por mês é preservado indefinidamente.
 *
 * GET  /quiz/today              → perguntas da semana (sem gabarito) ou resultado
 * POST /quiz/submit             → envia respostas, recebe pontuação
 * GET  /quiz/ranking            → ranking semanal + mensal
 * GET  /quiz/history            → histórico de meses anteriores
 * GET  /quiz/questions          → admin: lista todas as perguntas
 * POST /quiz/questions/import   → admin: importa perguntas em lote
 * POST /quiz/questions          → admin: cria pergunta
 * PATCH  /quiz/questions/:id    → admin: edita / toggle ativo
 * DELETE /quiz/questions/:id    → admin: exclui permanentemente
 */
const express = require('express')
const router  = express.Router()
const { requireAuth, requireAdmin } = require('../middleware/auth')
const pool = require('../db/pool')

// ── Seeded random (Mulberry32) ────────────────────────────────────────────────

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5) | 0
    t = Math.imul(t ^ (t >>> 15), 1 | t)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Helpers de data (horário de Brasília = UTC-3) ─────────────────────────────

/** Segunda-feira desta semana em Brasília — YYYY-MM-DD */
function weekStart() {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const day = now.getUTCDay() // 0 = Dom
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - (day === 0 ? 6 : day - 1))
  const y = monday.getUTCFullYear()
  const m = String(monday.getUTCMonth() + 1).padStart(2, '0')
  const d = String(monday.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Seed semanal (= YYYYMMDD da segunda-feira) */
function weekSeed() {
  return parseInt(weekStart().replace(/-/g, ''), 10)
}

/** Primeiro dia do mês atual em Brasília — YYYY-MM-DD */
function monthStart() {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

/** Seleciona N perguntas da semana de forma determinística pelo seed semanal */
function selectWeekQuestions(all, n = 5) {
  const rand = mulberry32(weekSeed())
  return [...all].sort(() => rand() - 0.5).slice(0, n)
}

// ── GET /quiz/today ───────────────────────────────────────────────────────────

router.get('/today', requireAuth, async (req, res) => {

  const userId = req.uid
  const ws     = weekStart()   // segunda-feira desta semana

  let conn
  try {
    conn = await pool.getConnection()

    // Já jogou esta semana? (aceita tanto o Monday-date quanto datas diárias legadas da mesma semana)
    const [[attempt]] = await conn.query(
      `SELECT * FROM quiz_attempts
        WHERE user_id = ?
          AND played_date BETWEEN ? AND DATE_ADD(?, INTERVAL 6 DAY)
        ORDER BY played_date DESC
        LIMIT 1`,
      [userId, ws, ws]
    )

    if (attempt) {
      const answers = JSON.parse(attempt.answers)
      const ids     = answers.map(a => a.questionId)
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
        weekStartDate: ws,
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

    const selected = selectWeekQuestions(all)

    res.json({
      status: 'pending',
      weekStartDate: ws,
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

router.post('/submit', requireAuth, async (req, res) => {

  const userId = req.uid
  const ws     = weekStart()   // sempre armazena a segunda-feira como played_date

  let conn
  try {
    conn = await pool.getConnection()

    // Evita submissão dupla na semana (verifica segunda a domingo)
    const [[existing]] = await conn.query(
      `SELECT id FROM quiz_attempts
        WHERE user_id = ?
          AND played_date BETWEEN ? AND DATE_ADD(?, INTERVAL 6 DAY)
        LIMIT 1`,
      [userId, ws, ws]
    )
    if (existing) {
      return res.status(409).json({ error: 'Você já jogou esta semana. Volte na próxima segunda-feira!' })
    }

    const { answers } = req.body // [{ questionId, chosen, timeMs }]
    if (!Array.isArray(answers) || answers.length !== 5) {
      return res.status(400).json({ error: 'Envie exatamente 5 respostas.' })
    }

    // Valida que os questionIds correspondem ao quiz desta semana
    const [all]     = await conn.query('SELECT * FROM quiz_questions WHERE active = 1 ORDER BY id')
    const weekQs    = selectWeekQuestions(all)
    const weekIds   = new Set(weekQs.map(q => q.id))

    if (!answers.every(a => weekIds.has(a.questionId))) {
      return res.status(400).json({ error: 'Perguntas inválidas para esta semana.' })
    }

    // Calcula pontuação
    const TIME_LIMIT_MS = 15_000
    let   score         = 0

    const fullAnswers = answers.map(ans => {
      const q         = weekQs.find(q => q.id === ans.questionId)
      const correct   = q?.correct ?? null
      const isCorrect = ans.chosen && ans.chosen === correct
      const timeMs    = Math.min(Math.max(0, Number(ans.timeMs) || TIME_LIMIT_MS), TIME_LIMIT_MS)
      const timeBonus = isCorrect ? Math.round((TIME_LIMIT_MS - timeMs) / TIME_LIMIT_MS * 100) : 0
      const pts       = isCorrect ? 100 + timeBonus : 0
      score += pts
      return { questionId: ans.questionId, chosen: ans.chosen || null, correct, timeMs, pts }
    })

    // Armazena com played_date = segunda-feira (garante unicidade semanal via UNIQUE constraint)
    await conn.query(
      'INSERT INTO quiz_attempts (user_id, played_date, score, answers) VALUES (?, ?, ?, ?)',
      [userId, ws, score, JSON.stringify(fullAnswers)]
    )

    const qMap = Object.fromEntries(weekQs.map(q => [q.id, q]))
    res.json({
      score,
      weekStartDate: ws,
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

router.get('/ranking', requireAuth, async (req, res) => {

  const userId = req.uid
  const ws     = weekStart()
  const ms     = monthStart()

  let conn
  try {
    conn = await pool.getConnection()

    // Ranking desta semana (segunda a domingo, cobre datas legadas)
    const [weekly] = await conn.query(`
      SELECT a.user_id, u.name, u.photo_url,
             a.score AS total_score,
             1       AS weeks_played
        FROM quiz_attempts a
        LEFT JOIN users u ON u.id = a.user_id
       WHERE a.played_date BETWEEN ? AND DATE_ADD(?, INTERVAL 6 DAY)
       ORDER BY total_score DESC
       LIMIT 20
    `, [ws, ws])

    // Ranking mensal — acumula todas as semanas do mês
    const [monthly] = await conn.query(`
      SELECT a.user_id, u.name, u.photo_url,
             SUM(a.score) AS total_score,
             COUNT(*)     AS weeks_played
        FROM quiz_attempts a
        LEFT JOIN users u ON u.id = a.user_id
       WHERE a.played_date >= ?
       GROUP BY a.user_id
       ORDER BY total_score DESC
       LIMIT 20
    `, [ms])

    // Dados do usuário atual nesta semana
    const [[weekAttempt]] = await conn.query(
      `SELECT score FROM quiz_attempts
        WHERE user_id = ?
          AND played_date BETWEEN ? AND DATE_ADD(?, INTERVAL 6 DAY)
        LIMIT 1`,
      [userId, ws, ws]
    )
    const myMonthlyRow    = monthly.find(r => r.user_id === userId)
    const myMonthlyRank   = monthly.findIndex(r => r.user_id === userId)

    res.json({
      weekly: weekly.map((r, i) => ({
        position:    i + 1,
        userId:      r.user_id,
        name:        r.name     ?? 'Usuário',
        photoUrl:    r.photo_url ?? null,
        totalScore:  r.total_score,
        weeksPlayed: r.weeks_played,
      })),
      monthly: monthly.map((r, i) => ({
        position:    i + 1,
        userId:      r.user_id,
        name:        r.name     ?? 'Usuário',
        photoUrl:    r.photo_url ?? null,
        totalScore:  r.total_score,
        weeksPlayed: r.weeks_played,
      })),
      myPosition:      myMonthlyRank >= 0 ? myMonthlyRank + 1 : null,
      myMonthlyScore:  myMonthlyRow?.total_score  ?? 0,
      weekScore:       weekAttempt?.score         ?? null,
      weekStartDate:   ws,
      monthStartDate:  ms,
    })
  } catch (err) {
    console.error('[quiz/ranking]', err)
    res.status(500).json({ error: 'Erro interno.' })
  } finally {
    conn?.release()
  }
})

// ── GET /quiz/history ─────────────────────────────────────────────────────────

router.get('/history', requireAuth, async (req, res) => {

  const ms = monthStart()

  let conn
  try {
    conn = await pool.getConnection()

    // Busca todos os meses anteriores ao atual
    const [rows] = await conn.query(`
      SELECT DATE_FORMAT(a.played_date, '%Y-%m') AS month,
             a.user_id, u.name, u.photo_url,
             SUM(a.score) AS total_score,
             COUNT(*)     AS weeks_played
        FROM quiz_attempts a
        LEFT JOIN users u ON u.id = a.user_id
       WHERE DATE_FORMAT(a.played_date, '%Y-%m') < DATE_FORMAT(?, '%Y-%m')
       GROUP BY month, a.user_id
       ORDER BY month DESC, total_score DESC
    `, [ms])

    // Agrupa por mês
    const months = {}
    for (const r of rows) {
      if (!months[r.month]) months[r.month] = []
      months[r.month].push({
        userId:      r.user_id,
        name:        r.name     ?? 'Usuário',
        photoUrl:    r.photo_url ?? null,
        totalScore:  r.total_score,
        weeksPlayed: r.weeks_played,
      })
    }

    const history = Object.entries(months)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, ranking]) => ({
        month,
        label: new Date(`${month}-15`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        ranking: ranking.map((r, i) => ({ position: i + 1, ...r })),
      }))

    res.json(history)
  } catch (err) {
    console.error('[quiz/history]', err)
    res.status(500).json({ error: 'Erro interno.' })
  } finally {
    conn?.release()
  }
})

// ── Admin: POST /quiz/questions/import ───────────────────────────────────────

router.post('/questions/import', requireAuth, requireAdmin, async (req, res) => {

  const { questions } = req.body

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Envie um array de perguntas.' })
  }
  if (questions.length > 200) {
    return res.status(400).json({ error: 'Máximo de 200 perguntas por importação.' })
  }

  const VALID_CORRECT = ['a', 'b', 'c', 'd']
  const VALID_DIFF    = ['facil', 'medio', 'dificil']
  const REQUIRED      = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct']

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    for (const field of REQUIRED) {
      if (!q[field] || typeof q[field] !== 'string' || !q[field].trim()) {
        return res.status(400).json({ error: `Pergunta ${i + 1}: campo "${field}" obrigatório.` })
      }
    }
    if (!VALID_CORRECT.includes(q.correct)) {
      return res.status(400).json({ error: `Pergunta ${i + 1}: "correct" deve ser a, b, c ou d.` })
    }
    if (q.difficulty && !VALID_DIFF.includes(q.difficulty)) {
      return res.status(400).json({ error: `Pergunta ${i + 1}: "difficulty" deve ser facil, medio ou dificil.` })
    }
  }

  let conn
  try {
    conn = await pool.getConnection()
    await conn.beginTransaction()

    const ids = []
    for (const q of questions) {
      const [result] = await conn.query(
        `INSERT INTO quiz_questions
           (question, option_a, option_b, option_c, option_d, correct, category, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          q.question.trim(), q.option_a.trim(), q.option_b.trim(),
          q.option_c.trim(), q.option_d.trim(), q.correct,
          (q.category || 'geral').trim().toLowerCase(),
          q.difficulty || 'facil',
        ]
      )
      ids.push(result.insertId)
    }

    await conn.commit()
    res.status(201).json({ imported: ids.length, ids })
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {})
    console.error('[quiz/questions/import]', err)
    res.status(500).json({ error: 'Erro interno ao importar perguntas.' })
  } finally {
    conn?.release()
  }
})

// ── Admin: GET /quiz/questions ────────────────────────────────────────────────

router.get('/questions', requireAuth, requireAdmin, async (req, res) => {

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

router.post('/questions', requireAuth, requireAdmin, async (req, res) => {

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

// ── Admin: PATCH /quiz/questions/:id ─────────────────────────────────────────

router.patch('/questions/:id', requireAuth, requireAdmin, async (req, res) => {

  const allowed = ['question', 'option_a', 'option_b', 'option_c', 'option_d',
                   'correct', 'category', 'difficulty', 'active']

  const fields = []
  const values = []

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`)
      values.push(key === 'active' ? (req.body[key] ? 1 : 0) : req.body[key])
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar.' })
  }

  if (req.body.correct && !['a', 'b', 'c', 'd'].includes(req.body.correct)) {
    return res.status(400).json({ error: 'Resposta correta inválida.' })
  }

  let conn
  try {
    conn = await pool.getConnection()
    values.push(req.params.id)
    await conn.query(`UPDATE quiz_questions SET ${fields.join(', ')} WHERE id = ?`, values)
    const [[updated]] = await conn.query('SELECT * FROM quiz_questions WHERE id = ?', [req.params.id])
    res.json(updated)
  } catch (err) {
    console.error('[quiz/questions PATCH]', err)
    res.status(500).json({ error: 'Erro interno.' })
  } finally {
    conn?.release()
  }
})

// ── Admin: DELETE /quiz/questions/:id — exclusão permanente ──────────────────

router.delete('/questions/:id', requireAuth, requireAdmin, async (req, res) => {

  let conn
  try {
    conn = await pool.getConnection()
    const [result] = await conn.query(
      'DELETE FROM quiz_questions WHERE id = ?',
      [req.params.id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pergunta não encontrada.' })
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('[quiz/questions DELETE]', err)
    res.status(500).json({ error: 'Erro interno.' })
  } finally {
    conn?.release()
  }
})

module.exports = router
