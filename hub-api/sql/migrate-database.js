/**
 * Copia todos os dados de um banco MySQL para outro (mesma instância).
 *
 * Uso:
 *   node sql/migrate-database.js
 *   node sql/migrate-database.js --drop-old
 *
 * Variáveis (opcionais — defaults abaixo):
 *   SOURCE_DB=DB_Hub_Apps
 *   TARGET_DB=DB_Sebratel_Hub_Apps
 *   DROP_DATABASES=DB_Hub_Apps,DB_Hub_Apps_Prod   (só com --drop-old)
 */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })
const mysql = require('mysql2/promise')

const SOURCE_DB = process.env.SOURCE_DB || 'DB_Hub_Apps'
const TARGET_DB = process.env.TARGET_DB || 'DB_Sebratel_Hub_Apps'
const DROP_OLD = process.argv.includes('--drop-old')
const DROP_ONLY = process.argv.includes('--drop-only')
const DROP_DATABASES = (process.env.DROP_DATABASES || 'DB_Hub_Apps,DB_Hub_Apps_Prod')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function quoteId(name) {
  return '`' + String(name).replace(/`/g, '``') + '`'
}

async function listTables(conn, schema) {
  const [rows] = await conn.query(
    `SELECT table_name AS name
     FROM information_schema.tables
     WHERE table_schema = ? AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    [schema],
  )
  return rows.map((r) => r.name)
}

async function countRows(conn, schema, table) {
  const [[{ cnt }]] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM ${quoteId(schema)}.${quoteId(table)}`,
  )
  return Number(cnt)
}

async function assertSourceExists(conn) {
  const [rows] = await conn.query('SHOW DATABASES LIKE ?', [SOURCE_DB])
  if (!rows.length) {
    throw new Error(`Banco de origem não encontrado: ${SOURCE_DB}`)
  }
}

async function copyDatabase(conn) {
  console.log(`\nOrigem:  ${SOURCE_DB}`)
  console.log(`Destino: ${TARGET_DB}\n`)

  await assertSourceExists(conn)

  const [targetExists] = await conn.query('SHOW DATABASES LIKE ?', [TARGET_DB])
  if (targetExists.length) {
    const tables = await listTables(conn, TARGET_DB)
    if (tables.length > 0) {
      throw new Error(
        `Destino ${TARGET_DB} já existe com ${tables.length} tabela(s). ` +
          'Apague manualmente ou use outro TARGET_DB antes de migrar.',
      )
    }
    console.log(`Destino ${TARGET_DB} existe mas está vazio — reutilizando.`)
  } else {
    await conn.query(
      `CREATE DATABASE ${quoteId(TARGET_DB)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )
    console.log(`Banco ${TARGET_DB} criado.`)
  }

  const tables = await listTables(conn, SOURCE_DB)
  if (!tables.length) {
    throw new Error(`Origem ${SOURCE_DB} não possui tabelas.`)
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 0')

  const summary = []
  for (const table of tables) {
    const sourceCount = await countRows(conn, SOURCE_DB, table)
    process.stdout.write(`  ${table} (${sourceCount} linhas)... `)

    await conn.query(
      `CREATE TABLE ${quoteId(TARGET_DB)}.${quoteId(table)} LIKE ${quoteId(SOURCE_DB)}.${quoteId(table)}`,
    )

    if (sourceCount > 0) {
      await conn.query(
        `INSERT INTO ${quoteId(TARGET_DB)}.${quoteId(table)}
         SELECT * FROM ${quoteId(SOURCE_DB)}.${quoteId(table)}`,
      )
    }

    const targetCount = await countRows(conn, TARGET_DB, table)
    if (targetCount !== sourceCount) {
      throw new Error(`contagem divergente (${sourceCount} -> ${targetCount})`)
    }

    summary.push({ table, rows: targetCount })
    console.log('OK')
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 1')

  return summary
}

async function dropOldDatabases(conn) {
  if (!DROP_OLD && !DROP_ONLY) return

  console.log('\nRemovendo bancos antigos:')
  for (const db of DROP_DATABASES) {
    if (db === TARGET_DB) {
      console.log(`  ${db} — ignorado (é o destino)`)
      continue
    }
    const [exists] = await conn.query('SHOW DATABASES LIKE ?', [db])
    if (!exists.length) {
      console.log(`  ${db} — não existe, ignorado`)
      continue
    }
    await conn.query(`DROP DATABASE ${quoteId(db)}`)
    console.log(`  ${db} — removido`)
  }
}

async function run() {
  console.log('Sebratel Hub — Migração de banco')
  console.log('================================')
  console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`)

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    multipleStatements: false,
  })

  try {
    if (!DROP_ONLY) {
      const summary = await copyDatabase(conn)

      const total = summary.reduce((sum, item) => sum + item.rows, 0)
      console.log(`\n✅ Migração concluída: ${summary.length} tabelas, ${total} linhas em ${TARGET_DB}.`)
      console.log('\nAtualize DB_NAME no Portainer/.env para:', TARGET_DB)
    } else {
      console.log('\nModo --drop-only: pulando cópia de dados.')
    }

    await dropOldDatabases(conn)

    if (!DROP_OLD && !DROP_ONLY) {
      console.log('\nBancos antigos mantidos. Para apagar após validar:')
      console.log(`  node sql/migrate-database.js --drop-only`)
    }
  } finally {
    await conn.end()
  }
}

run().catch((err) => {
  console.error('\n❌ Erro:', err.message)
  process.exit(1)
})
