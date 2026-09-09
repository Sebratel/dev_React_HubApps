const rateLimit = require('express-rate-limit')

const uidOrIp = (req) => req.uid || req.ip

const auditLogLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  keyGenerator: uidOrIp,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Limite de audit-logs excedido. Tente novamente em 1 minuto.' },
})

const provisionLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyGenerator: uidOrIp,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Muitas tentativas de provision. Tente novamente em 1 minuto.' },
})

const adminWriteLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  keyGenerator: uidOrIp,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Limite de operações administrativas excedido. Tente novamente em 1 minuto.' },
})

const ssoLaunchLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  keyGenerator: uidOrIp,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Limite de tokens SSO excedido. Tente novamente em 1 minuto.' },
})

const kudosLimiter = rateLimit({
  windowMs: 60 * 60_000, // 1 hora
  max: 10,
  keyGenerator: uidOrIp,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Limite de kudos por hora atingido. Tente novamente mais tarde.' },
})

module.exports = { auditLogLimiter, provisionLimiter, adminWriteLimiter, ssoLaunchLimiter, kudosLimiter }
