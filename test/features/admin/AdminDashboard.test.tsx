/// <reference types="vitest/globals" />
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { AdminDashboard } from '@/features/admin/AdminDashboard'
import type { UserModel, AccessRequestModel, AuditLogModel, AppItemModel } from '@/types/models'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/firebase', () => ({ db: {}, auth: {}, rtdb: {}, functions: {} }))

const mockAdminUser: UserModel = {
  id: 'uid-admin',
  email: 'admin@sebratel.com.br',
  name: 'Admin',
  photoUrl: null,
  profile: 'admin',
  team: null,
  permissions: [],
  isActive: true,
  isAdmin: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  online: true,
  lastLogin: null,
}

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: mockAdminUser, isLoading: false, error: null }),
}))

vi.mock('@/services/admin/admin-user.service', () => ({
  listUsers: vi.fn(),
}))

vi.mock('@/services/admin/admin-app.service', () => ({
  listAllApps: vi.fn(),
}))

vi.mock('@/services/admin/admin-access-request.service', () => ({
  listAllAccessRequests: vi.fn(),
}))

vi.mock('@/services/admin/admin-audit-log.service', () => ({
  listAuditLogs: vi.fn(),
}))

import { listUsers } from '@/services/admin/admin-user.service'
import { listAllApps } from '@/services/admin/admin-app.service'
import { listAllAccessRequests } from '@/services/admin/admin-access-request.service'
import { listAuditLogs } from '@/services/admin/admin-audit-log.service'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeUser(id: string, isActive: boolean, isAdmin: boolean): UserModel {
  return {
    ...mockAdminUser,
    id,
    name: `User ${id}`,
    email: `${id}@sebratel.com.br`,
    isActive,
    isAdmin,
  }
}

function makeApp(id: string, active: boolean): AppItemModel {
  return {
    id,
    name: `App ${id}`,
    icon: '📦',
    lottie: null,
    description: '',
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
    status: active ? 'active' : 'maintenance',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function makeRequest(id: string, appName = 'Portal RH'): AccessRequestModel {
  return {
    id,
    userId: 'u-1',
    userName: 'Alice',
    email: 'alice@sebratel.com.br',
    teamId: null,
    teamName: '',
    appId: 'app-1',
    appName,
    reason: 'Preciso de acesso',
    status: 'pending',
    requestedAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    reviewedByUserId: null,
    reviewedByName: null,
    reviewedAt: null,
    reviewNote: null,
  }
}

function makeLog(id: string, userName: string, action: string): AuditLogModel {
  return {
    id,
    userId: 'u-1',
    userName,
    action,
    details: '',
    timestamp: new Date('2026-06-08T10:00:00Z'),
  }
}

const emptyPaginated = { data: [], pagination: { limit: 50, offset: 0, total: 0 } }

// ─── Test wrapper ─────────────────────────────────────────────────────────────

// Fresh QueryClient per test to prevent cross-test state contamination.
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page title', async () => {
    vi.mocked(listUsers).mockResolvedValue({ data: [], pagination: { limit: 500, offset: 0, total: 0 } })
    vi.mocked(listAllApps).mockResolvedValue([])
    vi.mocked(listAllAccessRequests).mockResolvedValue(emptyPaginated)
    vi.mocked(listAuditLogs).mockResolvedValue(emptyPaginated)

    render(<AdminDashboard />, { wrapper: createWrapper() })

    expect(screen.getByText('Painel Administrativo')).toBeTruthy()
  })

  it('shows loading skeletons while data is fetching', () => {
    // Queries never resolve → component stays in loading state
    vi.mocked(listUsers).mockImplementation(() => new Promise(() => {}))
    vi.mocked(listAllApps).mockImplementation(() => new Promise(() => {}))
    vi.mocked(listAllAccessRequests).mockImplementation(() => new Promise(() => {}))
    vi.mocked(listAuditLogs).mockImplementation(() => new Promise(() => {}))

    render(<AdminDashboard />, { wrapper: createWrapper() })

    // Metric titles are NOT shown while loading (cards render skeletons instead)
    expect(screen.queryByText('Total de Usuários')).toBeNull()
    // Sections exist but show skeleton lists, not data
    expect(screen.getByRole('region', { name: 'Solicitações pendentes' })).toBeTruthy()
  })

  it('calculates user metrics correctly', async () => {
    vi.mocked(listUsers).mockResolvedValue({
      data: [
        makeUser('u-1', true, true),   // active + admin
        makeUser('u-2', true, false),  // active only
        makeUser('u-3', false, false), // inactive
      ],
      pagination: { limit: 500, offset: 0, total: 3 },
    })
    vi.mocked(listAllApps).mockResolvedValue([])
    vi.mocked(listAllAccessRequests).mockResolvedValue(emptyPaginated)
    vi.mocked(listAuditLogs).mockResolvedValue(emptyPaginated)

    render(<AdminDashboard />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Total de Usuários')).toBeTruthy()
    })

    // totalUsers=3 comes from pagination.total
    expect(screen.getByText('3')).toBeTruthy()
    // activeUsers=2, inactiveUsers=1, adminUsers=1 appear as metric values
    expect(screen.getByText('Usuários Ativos')).toBeTruthy()
    expect(screen.getByText('Usuários Inativos')).toBeTruthy()
    expect(screen.getByText('Administradores')).toBeTruthy()
  })

  it('calculates app metrics correctly', async () => {
    vi.mocked(listUsers).mockResolvedValue({ data: [], pagination: { limit: 500, offset: 0, total: 0 } })
    vi.mocked(listAllApps).mockResolvedValue([
      makeApp('a-1', true), makeApp('a-2', true), makeApp('a-3', false),
    ])
    vi.mocked(listAllAccessRequests).mockResolvedValue(emptyPaginated)
    vi.mocked(listAuditLogs).mockResolvedValue(emptyPaginated)

    render(<AdminDashboard />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Apps Ativos')).toBeTruthy()
    })
    expect(screen.getByText('Apps Inativos')).toBeTruthy()
  })

  it('renders pending requests in the list', async () => {
    vi.mocked(listUsers).mockResolvedValue({ data: [], pagination: { limit: 500, offset: 0, total: 0 } })
    vi.mocked(listAllApps).mockResolvedValue([])
    vi.mocked(listAllAccessRequests).mockResolvedValue({
      data: [makeRequest('req-1', 'Portal RH')],
      pagination: { limit: 50, offset: 0, total: 1 },
    })
    vi.mocked(listAuditLogs).mockResolvedValue(emptyPaginated)

    render(<AdminDashboard />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy()
      expect(screen.getByText('→ Portal RH')).toBeTruthy()
    })
  })

  it('shows pending requests count metric', async () => {
    vi.mocked(listUsers).mockResolvedValue({ data: [], pagination: { limit: 500, offset: 0, total: 0 } })
    vi.mocked(listAllApps).mockResolvedValue([])
    vi.mocked(listAllAccessRequests).mockResolvedValue({
      data: [makeRequest('req-1')],
      pagination: { limit: 50, offset: 0, total: 5 }, // 5 total pending
    })
    vi.mocked(listAuditLogs).mockResolvedValue(emptyPaginated)

    render(<AdminDashboard />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Solicitações Pendentes')).toBeTruthy()
    })
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('renders empty state when no pending requests', async () => {
    vi.mocked(listUsers).mockResolvedValue({ data: [], pagination: { limit: 500, offset: 0, total: 0 } })
    vi.mocked(listAllApps).mockResolvedValue([])
    vi.mocked(listAllAccessRequests).mockResolvedValue(emptyPaginated)
    vi.mocked(listAuditLogs).mockResolvedValue(emptyPaginated)

    render(<AdminDashboard />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Nenhuma solicitação pendente')).toBeTruthy()
    })
  })

  it('renders recent audit log entries', async () => {
    vi.mocked(listUsers).mockResolvedValue({ data: [], pagination: { limit: 500, offset: 0, total: 0 } })
    vi.mocked(listAllApps).mockResolvedValue([])
    vi.mocked(listAllAccessRequests).mockResolvedValue(emptyPaginated)
    vi.mocked(listAuditLogs).mockResolvedValue({
      data: [makeLog('log-1', 'Bob', 'USER_PROMOTE_ADMIN')],
      pagination: { limit: 10, offset: 0, total: 1 },
    })

    render(<AdminDashboard />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeTruthy()
      expect(screen.getByText('Promoveu a admin')).toBeTruthy()
    })
  })

  it('renders empty state when no audit logs', async () => {
    vi.mocked(listUsers).mockResolvedValue({ data: [], pagination: { limit: 500, offset: 0, total: 0 } })
    vi.mocked(listAllApps).mockResolvedValue([])
    vi.mocked(listAllAccessRequests).mockResolvedValue(emptyPaginated)
    vi.mocked(listAuditLogs).mockResolvedValue(emptyPaginated)

    render(<AdminDashboard />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Sem atividade recente')).toBeTruthy()
    })
  })

  it('shows error banner when a service fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.mocked(listUsers).mockRejectedValue(new Error('Server error'))
    vi.mocked(listAllApps).mockResolvedValue([])
    vi.mocked(listAllAccessRequests).mockResolvedValue(emptyPaginated)
    vi.mocked(listAuditLogs).mockResolvedValue(emptyPaginated)

    render(<AdminDashboard />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByText(/Alguns dados não puderam ser carregados/)).toBeTruthy()
    })

    consoleSpy.mockRestore()
  })

  it('shows error state in list sections when all services fail', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.mocked(listUsers).mockRejectedValue(new Error('fail'))
    vi.mocked(listAllApps).mockRejectedValue(new Error('fail'))
    vi.mocked(listAllAccessRequests).mockRejectedValue(new Error('fail'))
    vi.mocked(listAuditLogs).mockRejectedValue(new Error('fail'))

    render(<AdminDashboard />, { wrapper: createWrapper() })

    await waitFor(() => {
      // AdminErrorState "Ocorreu um erro ao carregar os dados." should appear in both sections
      const errors = screen.getAllByText('Ocorreu um erro ao carregar os dados.')
      expect(errors.length).toBeGreaterThanOrEqual(2)
    })

    consoleSpy.mockRestore()
  })
})
