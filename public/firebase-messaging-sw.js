// Firebase Cloud Messaging Service Worker
//
// B1 fix: config values are injected at build time by the Vite plugin
// `inject-firebase-sw-config` in vite.config.ts, which replaces %%PLACEHOLDER%%
// tokens with actual VITE_FIREBASE_* env values after the bundle is written.
//
// In development (no replacement): firebaseConfig.apiKey is the literal string
// '%%FIREBASE_API_KEY%%', which fails the guard check below. Firebase is NOT
// initialized and background messages are silently disabled. This is intentional —
// FCM background messages are a production-only concern.
//
// Version pinned to match package.json firebase ^10.14.0.

importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js')

const firebaseConfig = {
  apiKey:            '%%FIREBASE_API_KEY%%',
  authDomain:        '%%FIREBASE_AUTH_DOMAIN%%',
  projectId:         '%%FIREBASE_PROJECT_ID%%',
  storageBucket:     '%%FIREBASE_STORAGE_BUCKET%%',
  messagingSenderId: '%%FIREBASE_MESSAGING_SENDER_ID%%',
  appId:             '%%FIREBASE_APP_ID%%',
}

// Guard: if the placeholder wasn't replaced (dev / missing .env), disable FCM gracefully.
// An empty string also means the env var was not set during build — still safe to skip.
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('%%')) {
  console.warn('[FCM SW] Firebase config not injected — background messages disabled.')
} else {
  firebase.initializeApp(firebaseConfig)

  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    const { title = 'Sebratel Hub', body = '' } = payload.notification ?? {}
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
    })
  })
}
