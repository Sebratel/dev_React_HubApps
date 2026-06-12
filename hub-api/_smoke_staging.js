// Smoke test pós-deploy para staging
// Uso: node _smoke_staging.js
// Valida: API /health + DB (tabelas, índices, apps)
require('dotenv').config()
const https = require('https')
const pool  = require('./src/db/pool')

const API_BASE = process.env.STAGING_API_URL || 'https://hub-api.sebratel.com.br'

// ─── helpers ─────────────────────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let body = ''
      res.on('data', c => (body += c))
      res.on('end', () => resolve({ status: res.statusCode, body }))
    }).on('error', reject)
  })
}

let pass = 0, fail = 0
function check(label, ok, detail = '') {
  const icon = ok ? '  ✅' : '  ❌'
  console.log(`${icon} ${label}${detail ? `  (${detail})` : ''}`)
  ok ? pass++ : fail++
}

// ─── main ─────────────────────────────────────────────────────────────────────

;(async () => {
  console.log('\nSebratel Hub — Staging Smoke Test')
  console.log('==================================')
  console.log(`API: ${API_BASE}`)
  console.log(`DB:  ${process.env.DB_HOST}:${process.env.DB_PORT || 3306} / ${process.env.DB_NAME}\n`)

  // ── [1] API /health ────────────────────────────────────────────────────────
  console.log('[1] API Health')
  try {
    const { status, body } = await httpGet(`${API_BASE}/health`)
    check('GET /health → 200 {"status":"ok"}', status === 200 && body.includes('"ok"'), `HTTP ${status}`)
  } catch (err) {
    check('GET /health', false, err.message)
  }

  // ── [2] DB Connectivity ────────────────────────────────────────────────────
  console.log('\n[2] DB Connectivity')
  try {
    const [[row]] = await pool.query('SELECT 1 AS ping')
    check('MySQL connect', row.ping === 1)
  } catch (err) {
    check('MySQL connect', false, err.message)
    console.log('\n❌ DB inacessível — abortando.\n')
    await pool.end()
    process.exit(1)
  }

  // ── [3] Tables ─────────────────────────────────────────────────────────────
  console.log('\n[3] Tabelas (migration 01)')
  const TABLES = ['users', 'apps', 'audit_logs', 'access_requests']
  for (const t of TABLES) {
    try {
      const [[{ cnt }]] = await pool.query(`SELECT COUNT(*) AS cnt FROM \`${t}\``)
      check(`tabela: ${t}`, true, `${cnt} row(s)`)
    } catch (err) {
      check(`tabela: ${t}`, false, err.message)
    }
  }

  // ── [4] Composite indexes ──────────────────────────────────────────────────
  console.log('\n[4] Índices compostos (migration 02)')
  const INDEXES = [
    ['apps',            'idx_active_name'],
    ['users',           'idx_name'],
    ['audit_logs',      'idx_user_created'],
    ['audit_logs',      'idx_action_created'],
    ['access_requests', 'idx_status_created'],
  ]
  for (const [table, idx] of INDEXES) {
    const [[{ cnt }]] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM information_schema.statistics WHERE table_schema=? AND table_name=? AND index_name=?',
      [process.env.DB_NAME, table, idx],
    )
    check(`idx: ${table}.${idx}`, cnt > 0)
  }

  // ── [5] Apps cadastrados ───────────────────────────────────────────────────
  console.log('\n[5] Apps no DB')
  const [apps] = await pool.query('SELECT name, is_active FROM apps ORDER BY name')
  check('apps count ≥ 1', apps.length >= 1, `${apps.length} app(s)`)
  for (const a of apps) {
    console.log(`       · ${a.name} — ativo: ${a.is_active ? 'sim' : 'não'}`)
  }

  // ── [6] CORS header ────────────────────────────────────────────────────────
  console.log('\n[6] CORS (preflight OPTIONS)')
  try {
    const result = await new Promise((resolve, reject) => {
      const req = https.request(`${API_BASE}/health`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://hub-apps-staging.web.app', 'Access-Control-Request-Method': 'GET' },
      }, res => {
        const acao = res.headers['access-control-allow-origin'] || ''
        resolve({ status: res.statusCode, acao })
      })
      req.on('error', reject)
      req.end()
    })
    check('CORS: web.app aceito', result.acao.includes('hub-apps-staging.web.app') || result.acao === '*', result.acao || 'sem header')
  } catch (err) {
    check('CORS: preflight', false, err.message)
  }

  // ── Resultado ──────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(36))
  console.log(`Resultado: ${pass} ✅  ${fail} ❌`)
  if (fail === 0) {
    console.log('🟢 GO — Staging OK para smoke test manual.\n')
  } else {
    console.log('🔴 NO-GO — Corrigir as falhas acima antes do smoke test.\n')
  }

  await pool.end()
  process.exit(fail > 0 ? 1 : 0)
})()
