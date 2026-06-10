import {
  GoogleAuthProvider,
  signInWithPopup,
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

export async function signInWithGoogle(): Promise<AuthResult> {
  const result = await signInWithPopup(auth, googleProvider)
  const email = result.user.email ?? ''

  if (!isCorporateEmail(email) && !isThirdPartyEmail(email)) {
    await firebaseSignOut(auth)
    return {
      success: false,
      error: 'Acesso permitido apenas para e-mails corporativos (@sebratel.com.br) ou parceiros autorizados.',
    }
  }

  // onAuthStateChanged (useAuthSession) fetches / provisions the UserModel from Firestore
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
