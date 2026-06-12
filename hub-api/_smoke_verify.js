require('dotenv').config()
const pool = require('./src/db/pool')
;(async () => {
  console.log('=== AUTOMATED VERIFICATION ===\n')

  // 1 - DB connectivity
  const [[ping]] = await pool.query('SELECT 1 AS ok')
  console.log('[1] DB connectivity:', ping.ok === 1 ? 'PASS' : 'FAIL')

  // 2 - Tables
  const [tables] = await pool.query('SHOW TABLES')
  const names = tables.map(t => Object.values(t)[0])
  const required = ['apps', 'users', 'access_requests', 'audit_logs']
  const missing = required.filter(t => !names.includes(t))
  console.log('[2] Tables:', missing.length === 0 ? 'PASS' : 'FAIL - faltam: ' + missing.join(','))

  // 3 - User state
  const [[u]] = await pool.query(
    "SELECT profile, is_active, is_admin FROM users WHERE email='bruno.soares@sebratel.com.br'"
  )
  const userOK = u && u.profile === 'employee' && u.is_active === 1 && u.is_admin === 1
  console.log('[3] User state:', userOK ? 'PASS' : 'FAIL - ' + JSON.stringify(u))

  // 4 - Apps count
  const [[aCount]] = await pool.query('SELECT COUNT(*) AS n FROM apps WHERE is_active=1')
  console.log('[4] Apps ativos:', aCount.n === 3 ? 'PASS (3)' : 'FAIL - got ' + aCount.n)

  // 5 - Server-side filter: employee gets 2 apps
  const [allApps] = await pool.query('SELECT * FROM apps WHERE is_active=1')
  const profile = 'employee'
  const team = null
  const uid = 'TEST_UID'
  const visible = allApps.filter(app => {
    const profiles = JSON.parse(app.allowed_profiles || '[]')
    const users = JSON.parse(app.allowed_users || '[]')
    const teams = JSON.parse(app.allowed_teams || '[]')
    return profiles.includes(profile) || users.includes(uid) || (team && teams.includes(team))
  })
  const visibleNames = visible.map(a => a.name).join(', ')
  console.log('[5] Filter employee:', visible.length === 2 ? 'PASS (' + visibleNames + ')' : 'FAIL - got ' + visible.length)

  // 6 - audit_logs baseline
  const [[logCount]] = await pool.query('SELECT COUNT(*) AS n FROM audit_logs')
  console.log('[6] Audit logs baseline:', logCount.n >= 1 ? 'PASS (' + logCount.n + ')' : 'FAIL - nenhum log')

  // 7 - access_requests clean
  const [[reqCount]] = await pool.query('SELECT COUNT(*) AS n FROM access_requests')
  console.log('[7] Access requests:', reqCount.n === 0 ? 'PASS (vazio)' : 'WARN - ' + reqCount.n + ' registro(s)')

  process.exit(0)
})()
