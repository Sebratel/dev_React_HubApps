// Executa o schema SQL no MySQL remoto
// Uso: node sql/run-schema.js
require('dotenv').config()
const mysql = require('mysql2/promise')
const fs    = require('fs')
const path  = require('path')

async function run() {
  const sql = fs.readFileSync(path.resolve(__dirname, '01_create_database.sql'), 'utf8')

  // Conecta sem banco definido para poder criar o DB_Hub_Apps
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    multipleStatements: true,
  })

  console.log('Conectado ao MySQL. Executando schema...')
  await conn.query(sql)
  console.log('Schema DB_Hub_Apps criado com sucesso.')
  await conn.end()
}

run().catch(err => {
  console.error('Erro ao criar schema:', err.message)
  process.exit(1)
})
