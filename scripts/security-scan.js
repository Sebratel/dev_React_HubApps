#!/usr/bin/env node
// ADR-0001-D7 enforcement: blocks secrets from being bundled into the frontend.
// Run via: npm run security:scan
// Also runs as part of: npm run ci

import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

// ─── Forbidden patterns ──────────────────────────────────────────────────────
// Each entry: { pattern: RegExp, name: string, why: string }
const FORBIDDEN = [
  {
    name: 'JWT_SECRET env var',
    pattern: /JWT_SECRET/,
    why: 'JWT secrets must stay on the server (Cloud Functions). ADR-0001-D7.',
  },
  {
    name: 'PRIVATE_KEY env var',
    pattern: /PRIVATE_KEY/,
    why: 'Private keys must never enter the browser bundle.',
  },
  {
    name: 'client_secret literal',
    pattern: /client_secret/,
    why: 'OAuth client secrets must stay server-side.',
  },
  {
    name: 'jwt.sign() call',
    pattern: /\bjwt\.sign\s*\(/,
    why: 'JWT signing belongs in Cloud Functions, not the browser. ADR-0001-D7.',
  },
  {
    name: 'sign() call (bare)',
    // \bsign\s*\( matches sign( or sign  (  but NOT signIn( signOut( signInWithPopup(
    // because after "sign" the next char for those is uppercase I/O, not \s or (.
    pattern: /\bsign\s*\(/,
    why: 'Bare sign() call detected — potential crypto signing in the frontend.',
  },
  {
    name: 'generateToken identifier',
    pattern: /\bgenerateToken\b/,
    why: 'Token generation belongs in Cloud Functions. Use requestAppLaunchToken instead. ADR-0001-D7.',
  },
  {
    name: 'VITE_*SECRET env var',
    pattern: /VITE_\w*SECRET/i,
    why: 'VITE_* vars are embedded in the bundle. Secrets must not use this prefix.',
  },
  {
    name: 'VITE_*PRIVATE env var',
    pattern: /VITE_\w*PRIVATE/i,
    why: 'VITE_* vars are embedded in the bundle. Private keys must not use this prefix.',
  },
  {
    name: 'service_account key literal',
    pattern: /service_account/i,
    why: 'Service account credentials must only exist in Cloud Functions environment.',
  },
  {
    name: 'HS256/HS384/HS512 algorithm',
    pattern: /["']HS(256|384|512)["']/,
    why: 'HMAC JWT algorithms require a shared secret — must stay server-side.',
  },
]

// ─── Directories / extensions to scan ───────────────────────────────────────
const SCAN_DIRS = ['src', 'public', 'dist'].map((d) => join(ROOT, d))
const SCAN_ENV_GLOB = ['.env', '.env.local', '.env.development', '.env.development.local', '.env.production', '.env.staging']
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.env'])

// Files that are explicitly allowed to reference these patterns (e.g. this script itself,
// the .env.example docs file, and the ADR).
const ALLOWLIST_PATHS = [
  join(ROOT, 'scripts', 'security-scan.js'),
  join(ROOT, '.env.example'),
  join(ROOT, 'docs'),
]

function isAllowlisted(filePath) {
  return ALLOWLIST_PATHS.some((allowed) => filePath.startsWith(allowed))
}

// ─── File walker ─────────────────────────────────────────────────────────────
function* walkDir(dir) {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') continue
      yield* walkDir(full)
    } else if (SCAN_EXTENSIONS.has(extname(full)) || extname(full) === '') {
      yield full
    }
  }
}

// ─── Main scan ───────────────────────────────────────────────────────────────
let violations = 0
const findings = []

function scanFile(filePath) {
  if (isAllowlisted(filePath)) return
  let content
  try {
    content = readFileSync(filePath, 'utf8')
  } catch {
    return
  }

  const lines = content.split('\n')
  for (const { name, pattern, why } of FORBIDDEN) {
    lines.forEach((line, idx) => {
      if (pattern.test(line)) {
        findings.push({ filePath, line: idx + 1, name, why, content: line.trim() })
        violations++
      }
    })
  }
}

// Scan src/, public/, dist/
for (const dir of SCAN_DIRS) {
  for (const file of walkDir(dir)) {
    scanFile(file)
  }
}

// Scan .env* files at root
for (const envFile of SCAN_ENV_GLOB) {
  const full = join(ROOT, envFile)
  if (existsSync(full)) scanFile(full)
}

// ─── Report ──────────────────────────────────────────────────────────────────
if (findings.length === 0) {
  console.log('✅  security:scan passed — no forbidden patterns detected.')
  process.exit(0)
} else {
  console.error(`\n❌  security:scan FAILED — ${violations} violation(s) found:\n`)
  for (const f of findings) {
    console.error(`  File : ${f.filePath}`)
    console.error(`  Line : ${f.line}`)
    console.error(`  Rule : ${f.name}`)
    console.error(`  Why  : ${f.why}`)
    console.error(`  Code : ${f.content}`)
    console.error('')
  }
  process.exit(1)
}
