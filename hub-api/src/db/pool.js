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
  // Retorna colunas DATE como string "YYYY-MM-DD" em vez de objeto Date do JS.
  // Sem essa opção, mysql2 converte DATE → Date, e o input type="date" recebe
  // "[object Object]" como valor — exibindo vazio e perdendo o dado no reload.
  dateStrings:        ['DATE'],
})

module.exports = pool
