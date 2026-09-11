/**
 * Script de sincronização imediata de aniversários: Voalle → Hub
 * Uso: node src/scripts/sync-birth-dates.js
 *
 * Carrega o .env da raiz do monorepo e executa a sincronização uma única vez.
 * Útil para o primeiro sync ou para execuções manuais.
 */

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') })

const { syncBirthDates } = require('../scheduler/birthDateSync')

;(async () => {
  try {
    const result = await syncBirthDates()
    console.log('\n✅ Sync concluído:', result)
    process.exit(0)
  } catch (err) {
    console.error('\n❌ Erro durante o sync:', err.message)
    process.exit(1)
  }
})()
