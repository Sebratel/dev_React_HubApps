/**
 * Pool de conexão com o PostgreSQL da Voalle (ERP).
 * Usado exclusivamente para leitura de dados (aniversários).
 * Variáveis: VOALLE_DB_HOST, VOALLE_DB_PORT, VOALLE_DB_NAME,
 *            VOALLE_DB_USER, VOALLE_DB_PASS, VOALLE_DB_SSL
 */

const { Pool } = require('pg')

const voallePool = new Pool({
  host:     process.env.VOALLE_DB_HOST,
  port:     Number(process.env.VOALLE_DB_PORT) || 5432,
  database: process.env.VOALLE_DB_NAME,
  user:     process.env.VOALLE_DB_USER,
  password: process.env.VOALLE_DB_PASS,
  ssl:      process.env.VOALLE_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max:               5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

voallePool.on('error', (err) => {
  console.error('[voalle] idle client error:', err.message)
})

module.exports = voallePool
