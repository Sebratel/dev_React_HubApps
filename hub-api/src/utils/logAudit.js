const { randomUUID } = require('crypto')
const pool = require('../db/pool')
const AUDIT_ACTIONS = require('./auditActions')

async function logAudit({ uid, action, details, req, conn }) {
  if (!AUDIT_ACTIONS[action]) {
    throw new Error(`logAudit: ação inválida "${action}". Valores aceitos: ${Object.keys(AUDIT_ACTIONS).join(', ')}`)
  }

  const db = conn || pool

  const [[user]] = await db.query('SELECT name FROM users WHERE id = ?', [uid])
  const userName = user?.name || ''

  const ip = req?.headers?.['x-forwarded-for']?.split(',')[0].trim()
           || req?.socket?.remoteAddress
           || null

  let detailsStr = null
  if (details != null) {
    detailsStr = typeof details === 'string' ? details : JSON.stringify(details)
  }

  await db.query(
    `INSERT INTO audit_logs (id, user_id, user_name, action, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [randomUUID(), uid, userName, action, detailsStr, ip]
  )
}

module.exports = logAudit
