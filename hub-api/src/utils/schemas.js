const { z } = require('zod')

// ─── Middleware factory ────────────────────────────────────────────────────────

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const first = result.error.errors[0]
      const field = first.path.length ? `${first.path.join('.')}: ` : ''
      return res.status(400).json({ error: `${field}${first.message}` })
    }
    req.body = result.data
    next()
  }
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const kudosSchema = z.object({
  toUserId:    z.string().min(1).max(128),
  message:     z.string().min(1).max(300),
  isAnonymous: z.boolean().optional(),
})

const boardPostSchema = z.object({
  message: z.string().min(1).max(500),
})

const pollOptionItem = z.union([
  z.string().min(1).max(200),
  z.object({ text: z.string().min(1).max(200) }),
])

const pollSchema = z.object({
  question: z.string().min(1).max(200),
  options:  z.array(pollOptionItem).min(2).max(4),
  closesAt: z.string().optional(),
})

const suggestionSchema = z.object({
  title:   z.string().min(1).max(200),
  body:    z.string().max(2000).optional().nullable(),
  type:    z.enum(['feature', 'bug', 'improvement', 'other']).optional(),
  appId:   z.string().max(128).optional().nullable(),
  appName: z.string().max(200).optional().nullable(),
  sector:  z.string().min(1).max(100),
})

const announcementSchema = z.object({
  title:           z.string().min(1).max(200),
  body:            z.string().max(5000).optional().nullable(),
  type:            z.enum(['info', 'warning', 'urgent', 'success']).optional(),
  allowedProfiles: z.array(z.string().max(100)).max(50).optional(),
})

const usersMeSchema = z.object({
  name:       z.string().min(1).max(120).optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use o formato YYYY-MM-DD').nullable().optional(),
  status:     z.string().max(80).nullable().optional(),
})

module.exports = {
  validate,
  kudosSchema,
  boardPostSchema,
  pollSchema,
  suggestionSchema,
  announcementSchema,
  usersMeSchema,
}
