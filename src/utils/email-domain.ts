import { CORPORATE_EMAIL_SUFFIX, SPLITTERS_ORIGINS } from '@/constants/config'

export function isCorporateEmail(email: string): boolean {
  return email.toLowerCase().endsWith(CORPORATE_EMAIL_SUFFIX)
}

export function isThirdPartyEmail(email: string): boolean {
  return !isCorporateEmail(email)
}

export function isSplittersApp(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const origin = new URL(url).origin
    return SPLITTERS_ORIGINS.includes(origin)
  } catch {
    return false
  }
}
