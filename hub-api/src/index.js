require('dotenv').config()

const express   = require('express')
const helmet    = require('helmet')
const cors      = require('cors')
const morgan    = require('morgan')
const rateLimit = require('express-rate-limit')
const admin     = require('firebase-admin')
const path      = require('path')

// ─── Firebase Admin ───────────────────────────────────────────
if (!admin.apps.length) {
  let credential

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Env var contém o JSON do service account (em plain JSON ou base64)
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    try {
      // Tenta base64 primeiro, cai em plain JSON se falhar
      raw = Buffer.from(raw, 'base64').toString('utf8')
    } catch {}
    credential = admin.credential.cert(JSON.parse(raw))
  } else {
    const saPath = process.env.FIREBASE_SA_PATH
      || path.resolve(__dirname, '..', 'firebase-service-account.json')
    credential = admin.credential.cert(saPath)
  }

  admin.initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID,
  })
}

// ─── App ─────────────────────────────────────────────────────
const app = express()

app.set('trust proxy', 1)

app.use(helmet())
app.use(morgan('combined'))
app.use(express.json({ limit: '64kb' }))

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim())
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('CORS: origem não permitida'))
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Rate limiting global
app.use(rateLimit({
  windowMs: 60_000,
  max:      120,
  standardHeaders: true,
  legacyHeaders:   false,
}))

// ─── Rotas ───────────────────────────────────────────────────
app.use('/users',           require('./routes/users'))
app.use('/apps',            require('./routes/apps'))
app.use('/audit-logs',      require('./routes/auditLogs'))
app.use('/access-requests', require('./routes/accessRequests'))
app.use('/announcements',   require('./routes/announcements'))
app.use('/teams',           require('./routes/teams'))
app.use('/suggestions',     require('./routes/suggestions'))

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// ─── Error handler ───────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

// ─── Start ───────────────────────────────────────────────────
if (require.main === module) {
  const PORT = Number(process.env.PORT) || 3000
  app.listen(PORT, () => console.log(`hub-api rodando na porta ${PORT}`))
}

module.exports = app
