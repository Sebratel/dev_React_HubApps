/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest'
import { isCorporateEmail, isThirdPartyEmail, isSplittersApp } from '@/utils/email-domain'

describe('isCorporateEmail', () => {
  it('accepts @sebratel.com.br addresses', () => {
    expect(isCorporateEmail('joao@sebratel.com.br')).toBe(true)
    expect(isCorporateEmail('JOAO@SEBRATEL.COM.BR')).toBe(true) // case-insensitive
  })

  it('rejects non-corporate addresses', () => {
    expect(isCorporateEmail('joao@gmail.com')).toBe(false)
    expect(isCorporateEmail('joao@parceiro.com.br')).toBe(false)
    expect(isCorporateEmail('')).toBe(false)
  })

  it('rejects addresses that merely contain the suffix', () => {
    // Does not end with the suffix — should fail
    expect(isCorporateEmail('joao@sebratel.com.br.fake.com')).toBe(false)
  })
})

describe('isThirdPartyEmail', () => {
  it('is the inverse of isCorporateEmail', () => {
    expect(isThirdPartyEmail('joao@sebratel.com.br')).toBe(false)
    expect(isThirdPartyEmail('parceiro@empresa.com')).toBe(true)
  })
})

describe('isSplittersApp', () => {
  it('returns false for null or empty url', () => {
    expect(isSplittersApp(null)).toBe(false)
    expect(isSplittersApp('')).toBe(false)
    expect(isSplittersApp(undefined)).toBe(false)
  })

  it('returns true for known Splitters production origins', () => {
    expect(isSplittersApp('https://app-splitters-sebratel.web.app/some/path')).toBe(true)
    expect(isSplittersApp('https://app-splitters-sebratel-ceb1f.web.app/')).toBe(true)
  })

  it('returns false for unrelated URLs', () => {
    expect(isSplittersApp('https://other-app.web.app')).toBe(false)
    expect(isSplittersApp('https://sebratel.com.br')).toBe(false)
  })

  it('returns false for malformed URLs', () => {
    expect(isSplittersApp('not-a-url')).toBe(false)
  })
})
