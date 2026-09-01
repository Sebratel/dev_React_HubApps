const admin = require('firebase-admin')

const adminCache = new Map() // uid -> { isAdmin: boolean, expiresAt: number }
const CACHE_TTL_MS = 60_000

function invalidateAdminCache(uid) {
  adminCache.delete(uid)
}

// Only for test isolation — never call in production code
function _clearCacheForTesting() {
  adminCache.clear()
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  const token = header.slice(7)
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    const email = decoded.email || ''

    // Apenas contas do domínio corporativo @sebratel.com.br são aceitas
    if (!email.endsWith('@sebratel.com.br')) {
      return res.status(403).json({ error: 'Acesso restrito ao domínio @sebratel.com.br' })
    }

    req.uid   = decoded.uid
    req.email = email
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

async function requireAdmin(req, res, next) {
  const cached = adminCache.get(req.uid)
  if (cached && cached.expiresAt > Date.now()) {
    if (!cached.isAdmin) return res.status(403).json({ error: 'Acesso restrito a administradores' })
    return next()
  }

  const pool = require('../db/pool')
  const [rows] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.uid])
  const isAdmin = rows.length > 0 && rows[0].is_admin === 1

  adminCache.set(req.uid, { isAdmin, expiresAt: Date.now() + CACHE_TTL_MS })

  if (!isAdmin) return res.status(403).json({ error: 'Acesso restrito a administradores' })
  next()
}

module.exports = { requireAuth, requireAdmin, invalidateAdminCache, _clearCacheForTesting }
