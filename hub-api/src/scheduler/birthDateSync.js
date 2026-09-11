/**
 * Sincronização de datas de nascimento: Voalle (PostgreSQL) → Hub (MySQL)
 *
 * Regras de qualidade dos dados Voalle:
 *  - email deve ter ponto antes do @ (%.%@sebratel.com.br) — exclui contas departamentais
 *  - birth_date com ano entre 1940 e 2010
 *  - collaborator = true e deleted = false
 *  - exatamente 1 registro por email (sem duplicatas)
 *
 * Atualiza apenas usuários Hub cujo birth_date ainda é NULL (não sobrescreve dados existentes).
 *
 * Exporta:
 *  - syncBirthDates()  → função assíncrona chamável sob demanda ou pelo cron
 *  - startCron()       → agenda execução diária às 02:00 (America/Sao_Paulo)
 */

const cron       = require('node-cron')
const voallePool = require('../db/voalle')
const hubPool    = require('../db/pool')

const VOALLE_QUERY = `
  SELECT email, birth_date
  FROM   erp.people
  WHERE  collaborator = true
    AND  deleted      = false
    AND  email        ILIKE '%.%@sebratel.com.br'
    AND  birth_date   IS NOT NULL
    AND  EXTRACT(YEAR FROM birth_date) BETWEEN 1940 AND 2010
  GROUP  BY email, birth_date
  HAVING COUNT(*) = 1
`

async function syncBirthDates() {
  const label = '[birthDateSync]'
  console.log(`${label} iniciando sincronização...`)

  let voalleClient
  try {
    voalleClient = await voallePool.connect()
    const { rows } = await voalleClient.query(VOALLE_QUERY)
    console.log(`${label} ${rows.length} registros válidos encontrados na Voalle`)

    let updated = 0
    let skipped = 0
    let notFound = 0

    for (const row of rows) {
      const email     = row.email.toLowerCase().trim()
      const birthDate = row.birth_date // Date object from pg

      // Busca usuário Hub pelo email, apenas se birth_date ainda é NULL
      const [hubRows] = await hubPool.query(
        'SELECT id, birth_date FROM users WHERE LOWER(email) = ? LIMIT 1',
        [email]
      )

      if (!hubRows || hubRows.length === 0) {
        notFound++
        continue
      }

      const user = hubRows[0]
      if (user.birth_date !== null) {
        // Já tem data — não sobrescreve
        skipped++
        continue
      }

      // Formata para DATE compatível com MySQL (YYYY-MM-DD)
      const dateStr = birthDate instanceof Date
        ? birthDate.toISOString().slice(0, 10)
        : String(birthDate).slice(0, 10)

      await hubPool.query(
        'UPDATE users SET birth_date = ? WHERE id = ?',
        [dateStr, user.id]
      )
      updated++
    }

    console.log(
      `${label} concluído — atualizados: ${updated} | já tinham data: ${skipped} | não encontrados no Hub: ${notFound}`
    )
    return { updated, skipped, notFound, total: rows.length }
  } finally {
    if (voalleClient) voalleClient.release()
  }
}

function startCron() {
  // Executa todo dia às 02:00 no horário de Brasília
  cron.schedule('0 2 * * *', async () => {
    try {
      await syncBirthDates()
    } catch (err) {
      console.error('[birthDateSync] erro no cron:', err.message)
    }
  }, { timezone: 'America/Sao_Paulo' })

  console.log('[birthDateSync] cron agendado — executa diariamente às 02:00 (Brasília)')
}

module.exports = { syncBirthDates, startCron }
