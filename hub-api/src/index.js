const path = require('path')

// .env CENTRAL: um único arquivo na raiz do monorepo serve frontend + backend.
// Em Docker/produção o arquivo não existe e as vars vêm do ambiente do container
// (compose `environment:`) — neste caso config() simplesmente não carrega nada.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const express       = require('express')
const helmet        = require('helmet')
const cors          = require('cors')
const morgan        = require('morgan')
const rateLimit     = require('express-rate-limit')
const cookieParser  = require('cookie-parser')
const admin         = require('firebase-admin')

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

app.use(helmet({
  // CSP explícito — API só serve JSON/uploads, não HTML com scripts
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'none'"],
      scriptSrc:   ["'none'"],
      styleSrc:    ["'none'"],
      imgSrc:      ["'self'", 'data:'],
      connectSrc:  ["'self'"],
      fontSrc:     ["'none'"],
      objectSrc:   ["'none'"],
      mediaSrc:    ["'none'"],
      frameSrc:    ["'none'"],
      frameAncestors: ["'none'"],
      formAction:  ["'none'"],
      baseUri:     ["'none'"],
    },
  },
  // Não enviar referrer para fora do domínio
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Bloqueia MIME-type sniffing
  noSniff: true,
  // Bloqueia abertura em iframe de outros domínios
  xFrameOptions: { action: 'deny' },
  // Força HTTPS em navegadores que já acessaram via HTTPS
  hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
  // Remove o header X-Powered-By
  hidePoweredBy: true,
}))
app.use(morgan('combined'))
app.use(cookieParser())
// /avatar/save recebe imagem em base64 (até ~9MB) — demais rotas ficam em 50kb
const _jsonSmall = express.json({ limit: '50kb' })
const _jsonLarge = express.json({ limit: '12mb' })
app.use((req, res, next) => (req.path.startsWith('/avatar') ? _jsonLarge : _jsonSmall)(req, res, next))

// Static uploads — cross-origin allowed so React app (different port/domain) can display images
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  next()
}, express.static(path.join(__dirname, '..', 'public', 'uploads')))

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim())
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('CORS: origem não permitida'))
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
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
app.use('/auth',            require('./routes/auth'))
app.use('/users',           require('./routes/users'))
app.use('/apps',            require('./routes/apps'))
app.use('/audit-logs',      require('./routes/auditLogs'))
app.use('/access-requests', require('./routes/accessRequests'))
app.use('/announcements',   require('./routes/announcements'))
app.use('/teams',           require('./routes/teams'))
app.use('/suggestions',     require('./routes/suggestions'))
app.use('/admin',           require('./routes/admin'))
app.use('/highlights',      require('./routes/highlights'))
app.use('/manuals',         require('./routes/manuals'))
app.use('/upload',          require('./routes/upload'))
app.use('/kudos',           require('./routes/kudos'))
app.use('/birthday-wishes', require('./routes/birthdayWishes'))
app.use('/polls',           require('./routes/polls'))
app.use('/board',           require('./routes/boardPosts'))
app.use('/avatar',          require('./routes/avatar'))
app.use('/quiz',            require('./routes/quiz'))

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// ─── Error handler ───────────────────────────────────────────
app.use((err, req, res, _next) => {
  if (err.message?.startsWith('CORS:')) {
    const origin = req.headers.origin || '(sem origin)'
    console.warn(`[CORS] origem bloqueada: ${origin}`)
    return res.status(403).json({ error: err.message })
  }
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

// ─── Start ───────────────────────────────────────────────────
if (require.main === module) {
  const PORT = Number(process.env.PORT) || 3000

  // Executa migrations pendentes antes de abrir o servidor
  require('./db/migrate')()
    .catch(err => console.error('[migrate] ❌', err.message))
    .finally(() => {
      app.listen(PORT, () => {
        console.log(`hub-api rodando na porta ${PORT}`)
        // Sincronização nightly de datas de aniversário (Voalle → Hub, 02:00 Brasília)
        require('./scheduler/birthDateSync').startCron()
      })
    })
}

module.exports = app
