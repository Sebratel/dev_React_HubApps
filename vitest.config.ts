import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    // `src/firebase` sobe o Firebase ao ser importado (via `@/lib/api`); sem apiKey o getAuth
    // lança `auth/invalid-api-key` e a suíte nem carrega. Valores falsos: nada sai para a rede.
    env: {
      VITE_FIREBASE_API_KEY: 'test-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'hub-test.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'hub-test',
      VITE_FIREBASE_STORAGE_BUCKET: 'hub-test.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '0',
      VITE_FIREBASE_APP_ID: '1:0:web:test',
      VITE_FIREBASE_DATABASE_URL: 'https://hub-test-default-rtdb.firebaseio.com',
    },
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
