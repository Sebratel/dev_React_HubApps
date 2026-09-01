/**
 * Migração: adiciona birth_date e hire_date em users, cria tabela kudos.
 * Execute UMA vez: node hub-api/migrate.js
 */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const pool = require('./src/db/pool')

async function run() {
  const conn = await pool.getConnection()
  try {
    console.log('▶ Adicionando birth_date e hire_date em users...')
    await conn.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS birth_date DATE NULL,
        ADD COLUMN IF NOT EXISTS hire_date  DATE NULL
    `)
    console.log('✓ Colunas adicionadas (ou já existiam).')

    console.log('▶ Criando tabela kudos...')
    await conn.query(`
      CREATE TABLE IF NOT EXISTS kudos (
        id           VARCHAR(36)  PRIMARY KEY,
        from_user_id VARCHAR(128) NOT NULL,
        to_user_id   VARCHAR(128) NOT NULL,
        message      VARCHAR(300) NOT NULL,
        created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_to_user    (to_user_id),
        INDEX idx_created_at (created_at)
      )
    `)
    console.log('✓ Tabela kudos criada (ou já existia).')

    console.log('\n✅ Migração concluída com sucesso.')
  } catch (err) {
    console.error('❌ Erro na migração:', err.message)
    process.exit(1)
  } finally {
    conn.release()
    process.exit(0)
  }
}

run()
