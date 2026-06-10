/// <reference types="vitest/globals" />
import { describe, it, expect, vi } from 'vitest'

// Prevent Firebase initialization — tests only cover pure functions
vi.mock('@/firebase', () => ({ db: {}, auth: {}, rtdb: {}, functions: {} }))

import { searchApps, buildAppUrl } from '@/services/app.service'
import type { AppItemModel } from '@/types/models'

function makeApp(overrides: Partial<AppItemModel> = {}): AppItemModel {
  return {
    id: 'app-1',
    name: 'My App',
    icon: '🔧',
    lottie: null,
    description: 'Test description',
    type: 'internal',
    launchMode: 'url',
    deepLink: null,
    openInExternalBrowser: false,
    passUser: false,
    passToken: false,
    url: 'https://example.com',
    route: null,
    allowedProfiles: [],
    allowedUsers: [],
    allowedTeams: [],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('searchApps', () => {
  const apps = [
    makeApp({ id: '1', name: 'Splitters', description: 'Finance app' }),
    makeApp({ id: '2', name: 'HR Portal', description: 'Human resources' }),
    makeApp({ id: '3', name: 'Dashboard', description: 'Metrics and splitters' }),
  ]

  it('returns all apps for an empty query', () => {
    expect(searchApps(apps, '')).toHaveLength(3)
    expect(searchApps(apps, '  ')).toHaveLength(3)
  })

  it('filters by name case-insensitively', () => {
    expect(searchApps(apps, 'splitters')).toHaveLength(2) // name + description
    expect(searchApps(apps, 'SPLITTERS')).toHaveLength(2)
    expect(searchApps(apps, 'hr portal')).toHaveLength(1)
  })

  it('filters by description', () => {
    const result = searchApps(apps, 'Human')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('2')
  })

  it('returns empty array when no match', () => {
    expect(searchApps(apps, 'xyz-no-match')).toHaveLength(0)
  })
})

describe('buildAppUrl', () => {
  it('returns # when app has no url', () => {
    const app = makeApp({ url: null, passUser: true })
    expect(buildAppUrl(app, 'uid-1', 'John', 'j@example.com')).toBe('#')
  })

  it('returns url unchanged when passUser is false', () => {
    const app = makeApp({ url: 'https://app.example.com', passUser: false })
    expect(buildAppUrl(app, 'uid-1', 'John', 'j@example.com')).toBe('https://app.example.com')
  })

  it('appends user params when passUser is true', () => {
    const app = makeApp({ url: 'https://app.example.com', passUser: true })
    const url = buildAppUrl(app, 'uid-123', 'John Doe', 'john@example.com')
    expect(url).toContain('uid=uid-123')
    expect(url).toContain('name=John+Doe')
    expect(url).toContain('email=john%40example.com')
  })

  it('uses & separator when url already has query params', () => {
    const app = makeApp({ url: 'https://app.example.com?foo=bar', passUser: true })
    const url = buildAppUrl(app, 'uid-1', 'Jane', 'jane@example.com')
    expect(url.startsWith('https://app.example.com?foo=bar&')).toBe(true)
  })
})
