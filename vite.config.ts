import { defineConfig, type Plugin, type ResolvedConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

// B1 fix: Vite does not process files in public/ — VITE_* vars are not available
// inside the Firebase Messaging Service Worker at runtime.
// This plugin runs after the bundle is written and replaces %%PLACEHOLDER%% tokens
// in firebase-messaging-sw.js with the actual resolved env values.
// The SW file in public/ uses the placeholder syntax so it degrades gracefully
// in dev (where values are never replaced and FCM is intentionally disabled).
function injectFirebaseSwConfig(): Plugin {
  let resolvedConfig: ResolvedConfig

  return {
    name: 'inject-firebase-sw-config',
    apply: 'build', // build only — dev server serves public/ as-is
    configResolved(config) {
      resolvedConfig = config
    },
    closeBundle() {
      const swDest = join(process.cwd(), 'dist', 'firebase-messaging-sw.js')
      if (!existsSync(swDest)) {
        console.warn('[sw-config] firebase-messaging-sw.js not found in dist/ — skipping injection.')
        return
      }

      const env = resolvedConfig.env
      let content = readFileSync(swDest, 'utf8')

      const replacements: Record<string, string> = {
        '%%FIREBASE_API_KEY%%':              env.VITE_FIREBASE_API_KEY ?? '',
        '%%FIREBASE_AUTH_DOMAIN%%':          env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
        '%%FIREBASE_PROJECT_ID%%':           env.VITE_FIREBASE_PROJECT_ID ?? '',
        '%%FIREBASE_STORAGE_BUCKET%%':       env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
        '%%FIREBASE_MESSAGING_SENDER_ID%%':  env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
        '%%FIREBASE_APP_ID%%':               env.VITE_FIREBASE_APP_ID ?? '',
      }

      for (const [placeholder, value] of Object.entries(replacements)) {
        content = content.replaceAll(placeholder, value)
      }

      writeFileSync(swDest, content, 'utf8')
      console.log('[sw-config] Firebase SW config injected into dist/firebase-messaging-sw.js')
    },
  }
}

export default defineConfig({
  plugins: [react(), injectFirebaseSwConfig()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('firebase')) return 'vendor-firebase'
          return 'vendor'
        },
      },
    },
  },
})
