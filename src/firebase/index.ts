// ADR-0001-D8: Only PUBLIC Firebase config values here.
// These are designed by Firebase to be client-facing identifiers.
// See: https://firebase.google.com/docs/web/setup#config-object
// NEVER add JWT secrets, private keys, or service account data here.

import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
}

// Guard against double-initialization in hot-reload dev environments
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth      = getAuth(app)
export const rtdb      = getDatabase(app)
export const functions = getFunctions(app, 'us-central1')
export const storage   = getStorage(app)

export default app
