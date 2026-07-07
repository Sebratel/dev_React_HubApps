const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               Number(process.env.DB_PORT) || 3306,
  database:           process.env.DB_NAME,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASS,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  // MySQL DATETIME é gravado em horário de Brasília (sem offset no valor).
  // 'Z' fazia o driver interpretar como UTC → "há 3 h" para solicitações recentes.
  timezone:           process.env.DB_TIMEZONE || '-03:00',
})

module.exports = pool
