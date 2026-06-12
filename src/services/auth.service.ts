import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { auth } from '@/firebase'
import { isCorporateEmail, isThirdPartyEmail } from '@/utils/email-domain'
import type { AuthResult } from '@/types/models'

const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('email')
googleProvider.addScope('profile')

// Inicia o fluxo de login com Google via redirect (mais confiável que popup em ambientes corporativos)
export async function signInWithGoogle(): Promise<void> {
  await signInWithRedirect(auth, googleProvider)
}

// Deve ser chamado uma vez ao carregar o LoginPage para processar o retorno do redirect
export async function checkGoogleRedirectResult(): Promise<AuthResult | null> {
  const result = await getRedirectResult(auth)
  if (!result) return null

  const email = result.user.email ?? ''
  if (!isCorporateEmail(email) && !isThirdPartyEmail(email)) {
    await firebaseSignOut(auth)
    return {
      success: false,
      error: 'Acesso permitido apenas para e-mails corporativos (@sebratel.com.br) ou parceiros autorizados.',
    }
  }

  return { success: true }
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
