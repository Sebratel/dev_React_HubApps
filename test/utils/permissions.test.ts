/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  canAccessAdminDashboard,
} from '@/utils/permissions'
import type { UserModel } from '@/types/models'
import type { AppItemModel } from '@/types/models'

function makeUser(overrides: Partial<UserModel> = {}): UserModel {
  return {
    id: 'uid-1',
    email: 'test@sebratel.com.br',
    name: 'Test User',
    photoUrl: null,
    profile: 'employee',
    team: null,
    teamName: null,
    permissions: [],
    isActive: true,
    isAdmin: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    online: false,
    lastLogin: null,
    ...overrides,
  }
}

function makeApp(overrides: Partial<AppItemModel> = {}): AppItemModel {
  return {
    id: 'app-1',
    name: 'Test App',
    icon: '🔧',
    lottie: null,
    description: 'Test',
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
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

describe('hasPermission', () => {
  it('returns true when user has the permission', () => {
    const user = makeUser({ permissions: ['manage_users', 'view_reports'] })
    expect(hasPermission(user, 'manage_users')).toBe(true)
  })

  it('returns false when user lacks the permission', () => {
    const user = makeUser({ permissions: ['view_reports'] })
    expect(hasPermission(user, 'manage_users')).toBe(false)
  })

  it('returns false for empty permissions array', () => {
    const user = makeUser({ permissions: [] })
    expect(hasPermission(user, 'anything')).toBe(false)
  })
})

describe('canAccessAdminDashboard', () => {
  it('allows access when isAdmin is true', () => {
    expect(canAccessAdminDashboard(makeUser({ isAdmin: true }))).toBe(true)
  })

  it('allows access when user has admin_third permission', () => {
    expect(canAccessAdminDashboard(makeUser({ permissions: ['admin_third'] }))).toBe(true)
  })

  it('denies access for regular user', () => {
    expect(canAccessAdminDashboard(makeUser())).toBe(false)
  })

  it('denies access for inactive admin (isActive is separate concern — guard checks isActive)', () => {
    // canAccessAdminDashboard only checks role, not isActive — ActiveRoute handles isActive
    expect(canAccessAdminDashboard(makeUser({ isAdmin: true, isActive: false }))).toBe(true)
  })
})

// userHasAppAccess e getAppsWithoutAccess foram removidas em 8e1a3a7
// (todos os apps ativos são visíveis para qualquer usuário autenticado)
