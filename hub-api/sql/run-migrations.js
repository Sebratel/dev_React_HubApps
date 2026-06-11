require('dotenv').config()
const mysql = require('mysql2/promise')
const fs    = require('fs')
const path  = require('path')

// Splits SQL into individual statements, skipping blank/comment-only chunks
function splitStatements(sql) {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.replace(/^(--.*)(\n|$)/gm, '').trim().length > 0)
}

const MIGRATIONS = [
  { file: '01_create_database.sql',       label: 'Criar schema DB_Hub_Apps'          },
  { file: '02_add_indexes.sql',           label: 'Índices compostos'                 },
  { file: '03_add_passuser_status.sql',   label: 'pass_user e status em apps'        },
  { file: '04_seed_apps.sql',             label: 'Seed apps iniciais Sebratel'       },
  { file: '05_create_announcements.sql',  label: 'Tabela de avisos'                  },
  { file: '06_create_teams.sql',          label: 'Tabela de times'                   },
]

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

  console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}\n`)

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
