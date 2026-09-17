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

const boardLimiter = rateLimit({
  windowMs: 10 * 60_000, // 10 minutos
  max: 5,
  keyGenerator: uidOrIp,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Limite de posts no mural atingido. Tente novamente em 10 minutos.' },
})

const birthdayWishLimiter = rateLimit({
  windowMs: 60 * 60_000, // 1 hora
  max: 20,
  keyGenerator: uidOrIp,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Limite de mensagens de parabéns atingido. Tente novamente mais tarde.' },
})

const suggestionLimiter = rateLimit({
  windowMs: 60 * 60_000, // 1 hora
  max: 10,
  keyGenerator: uidOrIp,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Limite de sugestões por hora atingido. Tente novamente mais tarde.' },
})

const avatarSaveLimiter = rateLimit({
  windowMs: 10 * 60_000, // 10 minutos
  max: 5,
  keyGenerator: uidOrIp,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Limite de salvamento de avatar atingido. Tente novamente em 10 minutos.' },
})

const avatarGenerateLimiter = rateLimit({
  windowMs: 60 * 60_000, // 1 hora
  max: 10,
  keyGenerator: uidOrIp,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Limite de geração de avatares atingido. Tente novamente em 1 hora.' },
})

const pollCreateLimiter = rateLimit({
  windowMs: 60 * 60_000, // 1 hora
  max: 3,
  keyGenerator: uidOrIp,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Limite de criação de enquetes atingido. Tente novamente em 1 hora.' },
})

const pollVoteLimiter = rateLimit({
  windowMs: 60_000, // 1 minuto
  max: 10,
  keyGenerator: uidOrIp,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Muitas tentativas de voto. Tente novamente em 1 minuto.' },
})

const suggestionCommentLimiter = rateLimit({
  windowMs: 60_000, // 1 minuto
  max: 10,
  keyGenerator: uidOrIp,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Muitos comentários em sequência. Tente novamente em 1 minuto.' },
})

const suggestionVoteLimiter = rateLimit({
  windowMs: 60_000, // 1 minuto
  max: 20,
  keyGenerator: uidOrIp,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Muitos votos em sequência. Tente novamente em 1 minuto.' },
})

module.exports = {
  auditLogLimiter,
  provisionLimiter,
  adminWriteLimiter,
  ssoLaunchLimiter,
  kudosLimiter,
  boardLimiter,
  birthdayWishLimiter,
  suggestionLimiter,
  avatarSaveLimiter,
  avatarGenerateLimiter,
  pollCreateLimiter,
  pollVoteLimiter,
  suggestionCommentLimiter,
  suggestionVoteLimiter,
}
