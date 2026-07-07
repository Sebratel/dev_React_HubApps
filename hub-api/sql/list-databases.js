const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })
const mysql = require('mysql2/promise')

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
  })

  const [rows] = await conn.query('SHOW DATABASES')
  const dbs = rows
    .map((r) => Object.values(r)[0])
    .filter((name) => /hub|sebratel/i.test(name))

  for (const db of dbs) {
    const [tables] = await conn.query(
      `SELECT COUNT(*) AS tables FROM information_schema.tables WHERE table_schema = ?`,
      [db],
    )
    let rowTotal = 0
    const [tableNames] = await conn.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
      [db],
    )
    for (const { TABLE_NAME, table_name } of tableNames) {
      const table = TABLE_NAME || table_name
      const [[{ cnt }]] = await conn.query(`SELECT COUNT(*) AS cnt FROM \`${db}\`.\`${table}\``)
      rowTotal += Number(cnt)
    }
    console.log(`${db}: ${tables[0].tables} tabelas, ${rowTotal} linhas`)
  }

  await conn.end()
}

run().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
