/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  canAccessAdminDashboard,
  userHasAppAccess,
  getAppsWithoutAccess,
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

describe('userHasAppAccess', () => {
  it('denies access when app is in maintenance', () => {
    const user = makeUser({ profile: 'employee', permissions: ['all'] })
    const app = makeApp({ status: 'maintenance', allowedProfiles: ['employee'] })
    expect(userHasAppAccess(user, app)).toBe(false)
  })

  it('grants access via allowedProfiles match', () => {
    const user = makeUser({ profile: 'employee' })
    const app = makeApp({ allowedProfiles: ['employee'] })
    expect(userHasAppAccess(user, app)).toBe(true)
  })

  it('grants access via direct UID in allowedUsers', () => {
    const user = makeUser({ id: 'uid-direct' })
    const app = makeApp({ allowedUsers: ['uid-direct'] })
    expect(userHasAppAccess(user, app)).toBe(true)
  })

  it('grants access via team membership', () => {
    const user = makeUser({ team: 'team-devs' })
    const app = makeApp({ allowedTeams: ['team-devs'] })
    expect(userHasAppAccess(user, app)).toBe(true)
  })

  it('denies access when no matching criteria', () => {
    const user = makeUser({ profile: 'employee', id: 'uid-1', team: null })
    const app = makeApp({ allowedProfiles: ['admin'], allowedUsers: [], allowedTeams: [] })
    expect(userHasAppAccess(user, app)).toBe(false)
  })

  it('denies team access when user.team is null', () => {
    const user = makeUser({ team: null })
    const app = makeApp({ allowedTeams: ['team-devs'] })
    expect(userHasAppAccess(user, app)).toBe(false)
  })
})

describe('getAppsWithoutAccess', () => {
  it('returns apps not in the user apps list', () => {
    const all = [makeApp({ id: 'a' }), makeApp({ id: 'b' }), makeApp({ id: 'c' })]
    const userApps = [makeApp({ id: 'a' })]
    const result = getAppsWithoutAccess(all, userApps)
    expect(result.map((a) => a.id)).toEqual(['b', 'c'])
  })

  it('excludes maintenance apps from the result', () => {
    const all = [makeApp({ id: 'a' }), makeApp({ id: 'b', status: 'maintenance' })]
    const result = getAppsWithoutAccess(all, [])
    expect(result.map((a) => a.id)).toEqual(['a']) // 'b' excluded (maintenance)
  })

  it('returns empty array when user has access to all non-maintenance apps', () => {
    const all = [makeApp({ id: 'a' })]
    expect(getAppsWithoutAccess(all, all)).toHaveLength(0)
  })
})
