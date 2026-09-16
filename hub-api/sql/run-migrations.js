const path  = require('path')
// Lê o .env CENTRAL da raiz do monorepo (mesmo arquivo do backend).
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })
const mysql = require('mysql2/promise')
const fs    = require('fs')

// Splits SQL into individual statements, skipping blank/comment-only chunks.
// Ignores semicolons inside -- line comments to avoid breaking multi-line statements.
function splitStatements(sql) {
  // Remove inline -- comments before splitting so their semicolons are invisible
  const stripped = sql.replace(/--[^\n]*/g, '')
  return stripped
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

// Descobre automaticamente todos os *.sql em ordem alfabética
const MIGRATIONS = fs
  .readdirSync(__dirname)
  .filter(f => f.endsWith('.sql'))
  .sort()
  .map(file => ({ file, label: file.replace(/\.sql$/, '').replace(/_/g, ' ') }))

// Errors that mean "already exists" — safe to skip for idempotency
const SKIP_CODES = new Set([
  'ER_DUP_KEYNAME',
  'ER_TABLE_EXISTS_ERROR',
  'ER_DB_CREATE_EXISTS',
  'ER_DUP_FIELDNAME',  // ALTER TABLE ADD COLUMN quando coluna já existe
  'ER_DUP_ENTRY',      // INSERT IGNORE quando registro já existe
])

async function runMigration(conn, file) {
  const sql        = fs.readFileSync(path.resolve(__dirname, file), 'utf8')
  const statements = splitStatements(sql)
  let ok = 0, skipped = 0

  for (const stmt of statements) {
    try {
      await conn.query(stmt)
      ok++
    } catch (err) {
      if (SKIP_CODES.has(err.code)) {
        skipped++
      } else {
        throw Object.assign(err, { statement: stmt.substring(0, 100) })
      }
    }
  }
  return { ok, skipped }
}

async function run() {
  console.log('\nSebratel Hub — Migration Runner')
  console.log('================================\n')

  const conn = await mysql.createConnection({
    host:               process.env.DB_HOST,
    port:               Number(process.env.DB_PORT) || 3306,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASS,
    multipleStatements: false,
  })

  // Cria/seleciona o banco a partir do DB_NAME (permite bancos separados
  // por ambiente — staging x prod — na mesma instância MySQL).
  const DB_NAME = process.env.DB_NAME || 'DB_Hub_Apps'
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  await conn.query(`USE \`${DB_NAME}\``)

  console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`)
  console.log(`Database: ${DB_NAME}\n`)

  for (const { file, label } of MIGRATIONS) {
    process.stdout.write(`  [${file}] ${label}... `)
    try {
      const { ok, skipped } = await runMigration(conn, file)
      const detail = skipped ? `, ${skipped} já existiam (ignorados)` : ''
      console.log(`✅  ${ok} stmt(s) OK${detail}`)
    } catch (err) {
      console.log(`❌  ERRO`)
      console.error(`     Statement: ${err.statement}`)
      console.error(`     Erro:      ${err.message}`)
      await conn.end()
      process.exit(1)
    }
  }

  await conn.end()
  console.log('\n✅ Migrations concluídas.\n')
}

run().catch(err => {
  console.error('\n❌ Erro fatal:', err.message)
  process.exit(1)
})
