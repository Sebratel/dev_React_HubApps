import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { auth } from '@/firebase'
import { isCorporateEmail, isThirdPartyEmail } from '@/utils/email-domain'
import type { AuthResult } from '@/types/models'

const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('email')
googleProvider.addScope('profile')
// Força a seleção de conta mesmo que já exista sessão Google ativa no browser
googleProvider.setCustomParameters({ prompt: 'select_account' })

export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const email = result.user.email ?? ''

    if (!isCorporateEmail(email) && !isThirdPartyEmail(email)) {
      await firebaseSignOut(auth)
      return {
        success: false,
        error: 'Acesso permitido apenas para e-mails corporativos (@sebratel.com.br) ou parceiros autorizados.',
      }
    }

    return { success: true }
  } catch (err) {
    if (err instanceof FirebaseError) {
      // Usuário fechou o popup manualmente — não é erro
      if (
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request'
      ) {
        return { success: false, error: null }
      }
      console.error('[auth] Firebase error:', err.code, err.message)
      return { success: false, error: `Erro ao entrar com Google (${err.code}).` }
    }
    throw err
  }
}

export async function signInWithEmailAndPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  if (!isCorporateEmail(email) && !isThirdPartyEmail(email)) {
    return {
      success: false,
      error: 'Acesso permitido apenas para e-mails corporativos.',
    }
  }

  await firebaseSignInWithEmailAndPassword(auth, email, password)
  return { success: true }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export function getCurrentUser(): User | null {
  return auth.currentUser
}
