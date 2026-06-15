// ADR-0001-D8: reCAPTCHA site key is PUBLIC — designed to be embedded in HTML/JS.
// App Check is SKIPPED on local networks (dev/LAN) to avoid blocking development.
// This matches the Flutter implementation in lib/app/bootstrap.dart.

import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import app from './index'

function isLocalNetwork(): boolean {
  const { hostname } = window.location
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  )
}

export function initAppCheck(): void {
  if (isLocalNetwork()) {
    console.warn('[AppCheck] Skipped on local network — development mode.')
    return
  }

  if (import.meta.env.VITE_SKIP_APP_CHECK === 'true') {
    console.warn('[AppCheck] Skipped via VITE_SKIP_APP_CHECK.')
    return
  }

  const siteKey =
    import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY || '6LcawJMsAAAAADYYkDvNkzyOpb92hhOPuJ-Xd87G'

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  })
}
