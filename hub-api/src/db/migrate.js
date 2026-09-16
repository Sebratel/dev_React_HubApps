/**
 * Migration runner automático — roda na inicialização do hub-api.
 *
 * - Descobre todos os arquivos *.sql em hub-api/sql/ em ordem alfabética
 * - Mantém uma tabela `schema_migrations` para rastrear o que já foi aplicado
 * - Arquivos novos são aplicados automaticamente; existentes são ignorados
 * - Erros "já existe" (ALTER/CREATE idempotentes) são silenciados
 */

const fs   = require('fs')
const path = require('path')
const pool = require('./pool')

const SQL_DIR = path.resolve(__dirname, '../../sql')

const SKIP_CODES = new Set([
  'ER_DUP_KEYNAME',       // ADD INDEX quando índice já existe
  'ER_TABLE_EXISTS_ERROR', // CREATE TABLE quando tabela já existe
  'ER_DB_CREATE_EXISTS',  // CREATE DATABASE IF NOT EXISTS
  'ER_DUP_FIELDNAME',     // ALTER TABLE ADD COLUMN quando coluna já existe
  'ER_DUP_ENTRY',         // INSERT IGNORE quando registro já existe
])

function splitStatements(sql) {
  return sql
    .replace(/--[^\n]*/g, '')   // remove comentários de linha
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
}

async function runMigrations() {
  const conn = await pool.getConnection()
  try {
    // Garante que a tabela de controle existe
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   VARCHAR(255) NOT NULL,
        applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (filename)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    // Quais arquivos já foram aplicados?
    const [rows] = await conn.query('SELECT filename FROM schema_migrations')
    const applied = new Set(rows.map(r => r.filename))

    // Descobre *.sql em ordem (01_, 02_, ..., 19_, ...)
    const files = fs.readdirSync(SQL_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort()

    let pending = 0
    for (const file of files) {
      if (applied.has(file)) continue
      pending++

      const sql        = fs.readFileSync(path.join(SQL_DIR, file), 'utf8')
      const statements = splitStatements(sql)

      for (const stmt of statements) {
        try {
          await conn.query(stmt)
        } catch (err) {
          if (!SKIP_CODES.has(err.code)) {
            throw Object.assign(
              new Error(`Migration "${file}" falhou: ${err.message}`),
              { cause: err, file, stmt: stmt.slice(0, 120) }
            )
          }
        }
      }

      await conn.query(
        'INSERT INTO schema_migrations (filename) VALUES (?)',
        [file]
      )
      console.log(`[migrate] ✅  ${file}`)
    }

    if (pending === 0) {
      console.log('[migrate] Banco de dados já está atualizado.')
    } else {
      console.log(`[migrate] ${pending} migration(s) aplicada(s).`)
    }
  } finally {
    conn.release()
  }
}

module.exports = runMigrations
