require('dotenv').config()
const pool = require('./src/db/pool')
;(async () => {
  // Restaura Bruno como 'employee' para smoke test normal
  await pool.query("UPDATE users SET profile='employee' WHERE email='bruno.soares@sebratel.com.br'")
  // Limpa requests anteriores
  await pool.query('DELETE FROM access_requests')

  const [[u]]   = await pool.query("SELECT email, profile, is_active, is_admin FROM users WHERE email='bruno.soares@sebratel.com.br'")
  const [apps]  = await pool.query("SELECT id, name, allowed_profiles FROM apps WHERE is_active=1 ORDER BY name")
  const [[logs]] = await pool.query('SELECT COUNT(*) AS n FROM audit_logs')
  const [[reqs]] = await pool.query('SELECT COUNT(*) AS n FROM access_requests')

  console.log('\n=== SMOKE TEST BASELINE ===')
  console.log('Bruno:', JSON.stringify(u))
  console.log('Apps ativos:', apps.map(a => `${a.name} (${a.allowed_profiles})`).join(', '))
  console.log('audit_logs:', logs.n)
  console.log('access_requests:', reqs.n)
  console.log('\nERP Financeiro ID:', apps.find(a => a.name === 'ERP Financeiro')?.id)
  process.exit(0)
})()
