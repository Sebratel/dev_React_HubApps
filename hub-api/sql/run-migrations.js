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

const MIGRATIONS = [
  { file: '01_create_database.sql',       label: 'Criar schema DB_Hub_Apps'          },
  { file: '02_add_indexes.sql',           label: 'Índices compostos'                 },
  { file: '03_add_passuser_status.sql',   label: 'pass_user e status em apps'        },
  { file: '04_seed_apps.sql',             label: 'Seed apps iniciais Sebratel'       },
  { file: '05_create_announcements.sql',  label: 'Tabela de avisos'                  },
  { file: '06_create_teams.sql',          label: 'Tabela de times'                   },
  { file: '07_create_suggestions.sql',    label: 'Tabela de sugestões'               },
  { file: '08_add_heartbeat.sql',         label: 'Coluna last_heartbeat em users'    },
  { file: '09_add_favorites.sql',         label: 'Coluna favorites em users'         },
  { file: '10_add_review_note.sql',       label: 'Coluna review_note em access_requests' },
  { file: '11_add_card_color.sql',        label: 'Coluna card_color em apps'             },
  { file: '12_create_highlights.sql',     label: 'Tabela de destaques'                   },
  { file: '13_add_highlight_image_options.sql', label: 'Opções de imagem em highlights'  },
  { file: '14_create_suggestion_engagement.sql', label: 'Engajamento de sugestões'       },
  { file: '15_create_app_manuals.sql',    label: 'Tabela de manuais de aplicativos'      },
  { file: '16_expand_highlight_image_url.sql', label: 'Expande highlight_image_url'      },
  { file: '17_consolidate_suggestions_to_platform.sql', label: 'Consolida sugestões nas tabelas platform_*' },
  { file: '18_add_app_id_to_platform_suggestions.sql', label: 'Coluna app_id em platform_suggestions' },
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
