import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initAppCheck } from '@/firebase/app-check'
import { App } from './App'
import './styles/globals.css'

// A2 fix: initAppCheck failure (e.g. missing reCAPTCHA key in dev) must not
// crash before React mounts. App Check is degraded, not fatal.
try {
  initAppCheck()
} catch (err) {
  console.warn('[AppCheck] Initialization failed — continuing without App Check:', err)
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
