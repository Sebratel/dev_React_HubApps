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
  const serviceAccountPath = path.resolve(__dirname, '..', 'firebase-service-account.json')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    projectId:  process.env.FIREBASE_PROJECT_ID,
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
