/**
 * /auth — sessão de gateway para nginx auth_request
 *
 * POST   /auth/session  — valida Firebase ID token, define cookie hub_session
 * GET    /auth/validate — lido pelo nginx auth_request; retorna 200 ou 401
 * DELETE /auth/session  — limpa o cookie (logout)
 *
 * O cookie hub_session é definido no domínio .sebratel.com.br (env HUB_SESSION_DOMAIN)
 * com httpOnly + secure, de modo que todos os subdomínios o recebem mas o JS não
 * consegue lê-lo. O nginx verifica o cookie antes de liberar cada app.
 */

const router = require('express').Router()
const jwt    = require('jsonwebtoken')
const admin  = require('firebase-admin')

const SESSION_COOKIE_NAME = 'hub_session'
const SESSION_MAX_AGE_S   = 8 * 60 * 60 // 8 horas

function sessionSecret() {
  const s = process.env.HUB_SESSION_SECRET
  if (!s) throw new Error('HUB_SESSION_SECRET não definido')
  return s
}

function cookieOptions(maxAge = SESSION_MAX_AGE_S) {
  return {
    httpOnly:  true,
    secure:    process.env.NODE_ENV !== 'development',
    sameSite:  'lax',
    domain:    process.env.HUB_SESSION_DOMAIN || undefined, // ex: .sebratel.com.br
    maxAge:    maxAge * 1000, // Express usa ms
    path:      '/',
  }
}

// ─── POST /auth/session ───────────────────────────────────────────────────────
// Recebe Firebase ID token, valida, emite cookie de sessão de 8h.
// Chamado pelo frontend logo após o login.

router.post('/session', async (req, res, next) => {
  try {
    const { idToken } = req.body
    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({ error: 'idToken obrigatório' })
    }

    // Valida o Firebase ID token
    let decoded
    try {
      decoded = await admin.auth().verifyIdToken(idToken)
    } catch {
      return res.status(401).json({ error: 'Token Firebase inválido ou expirado' })
    }

    const email = decoded.email || ''
    if (!email.endsWith('@sebratel.com.br')) {
      return res.status(403).json({ error: 'Acesso restrito ao domínio @sebratel.com.br' })
    }

    // Cria sessão JWT local (8h, validado offline pelo nginx)
    const sessionToken = jwt.sign(
      { sub: decoded.uid, email, name: decoded.name || '' },
      sessionSecret(),
      { algorithm: 'HS256', expiresIn: SESSION_MAX_AGE_S }
    )

    res.cookie(SESSION_COOKIE_NAME, sessionToken, cookieOptions())
    res.json({ ok: true, expiresIn: SESSION_MAX_AGE_S })
  } catch (err) { next(err) }
})

// ─── GET /auth/validate ───────────────────────────────────────────────────────
// Usado exclusivamente pelo nginx auth_request.
// Não requer body — lê o cookie do header Cookie da subrequest.

router.get('/validate', (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME]
  if (!token) return res.status(401).end()

  try {
    jwt.verify(token, sessionSecret(), { algorithms: ['HS256'] })
    res.status(200).end()
  } catch {
    res.status(401).end()
  }
})

// ─── DELETE /auth/session ─────────────────────────────────────────────────────
// Limpa o cookie de sessão. Chamado pelo frontend no logout.

router.delete('/session', (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly:  true,
    secure:    process.env.NODE_ENV !== 'development',
    sameSite:  'lax',
    domain:    process.env.HUB_SESSION_DOMAIN || undefined,
    path:      '/',
  })
  res.json({ ok: true })
})

module.exports = router
