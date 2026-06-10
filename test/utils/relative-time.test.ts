/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatRelativeTime } from '@/utils/relative-time'

// Freeze time so tests are not sensitive to when they run.
const FIXED_NOW = new Date('2024-06-15T12:00:00.000Z').getTime()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

function minutesAgo(n: number): string {
  return new Date(FIXED_NOW - n * 60_000).toISOString()
}

function hoursAgo(n: number): string {
  return new Date(FIXED_NOW - n * 3_600_000).toISOString()
}

function daysAgo(n: number): string {
  return new Date(FIXED_NOW - n * 86_400_000).toISOString()
}

describe('formatRelativeTime', () => {
  it('returns "Acesso recente" for null', () => {
    expect(formatRelativeTime(null)).toBe('Acesso recente')
  })

  it('returns "Acesso recente" for undefined', () => {
    expect(formatRelativeTime(undefined)).toBe('Acesso recente')
  })

  it('returns "Acesso recente" for empty string', () => {
    expect(formatRelativeTime('')).toBe('Acesso recente')
  })

  it('returns "Acesso recente" for whitespace string', () => {
    expect(formatRelativeTime('   ')).toBe('Acesso recente')
  })

  it('returns "Acesso recente" for invalid date', () => {
    expect(formatRelativeTime('not-a-date')).toBe('Acesso recente')
  })

  it('returns "agora" for access less than 1 minute ago', () => {
    expect(formatRelativeTime(minutesAgo(0))).toBe('agora')
    expect(formatRelativeTime(new Date(FIXED_NOW - 30_000).toISOString())).toBe('agora') // 30s
  })

  it('returns "X min atrás" for access 1–59 minutes ago', () => {
    expect(formatRelativeTime(minutesAgo(1))).toBe('1 min atrás')
    expect(formatRelativeTime(minutesAgo(30))).toBe('30 min atrás')
    expect(formatRelativeTime(minutesAgo(59))).toBe('59 min atrás')
  })

  it('returns "X h atrás" for access 1–23 hours ago', () => {
    expect(formatRelativeTime(hoursAgo(1))).toBe('1 h atrás')
    expect(formatRelativeTime(hoursAgo(12))).toBe('12 h atrás')
    expect(formatRelativeTime(hoursAgo(23))).toBe('23 h atrás')
  })

  it('returns "X d atrás" for access 24+ hours ago', () => {
    expect(formatRelativeTime(daysAgo(1))).toBe('1 d atrás')
    expect(formatRelativeTime(daysAgo(7))).toBe('7 d atrás')
    expect(formatRelativeTime(daysAgo(30))).toBe('30 d atrás')
  })
})
