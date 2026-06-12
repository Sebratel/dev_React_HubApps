/// <reference types="vitest/globals" />
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AdminDashboard } from '@/features/admin/AdminDashboard'
import type { UserModel, AccessRequestModel, AuditLogModel } from '@/types/models'

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

vi.mock('@/features/admin/hooks/useAdminDashboard', () => ({
  useAdminDashboard: vi.fn(),
}))

vi.mock('@/features/admin/components/AdminMetricCard', () => ({
  AdminMetricCard: ({
    title,
    value,
    description,
  }: {
    title: string
    value: number | string
    description?: string
  }) => (
    <div>
      <span>{title}</span>
      <span>{String(value)}</span>
      {description ? <span>{description}</span> : null}
    </div>
  ),
}))

vi.mock('@/features/admin/components/AdminOnlineWidget', () => ({
  AdminOnlineWidget: () => <section aria-label="Usuários online agora" />,
}))

import { useAdminDashboard } from '@/features/admin/hooks/useAdminDashboard'

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

function makeLog(id: string, userName: string, action: string, details = ''): AuditLogModel {
  return {
    id,
    userId: 'u-1',
    userName,
    action,
    details,
    timestamp: new Date('2026-06-08T10:00:00Z'),
  }
}

const baseDashboardData = {
  metrics: {
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    adminUsers: 0,
    activeApps: 0,
    inactiveApps: 0,
    pendingRequests: 0,
    pendingSuggestions: 0,
    activeTeams: 0,
    activeAnnouncements: 0,
  },
  stats: {
    profileDistribution: [],
    topApps: [],
    pendingSuggestions: 0,
    pendingRequests: 0,
    inactiveUsers: 0,
    teams: { total: 0, active: 0 },
    announcements: { total: 0, active: 0 },
  },
  pendingRequests: [] as AccessRequestModel[],
  recentAuditLogs: [] as AuditLogModel[],
  isLoading: false,
  hasError: false,
  refetchAll: vi.fn(),
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>
  )
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAdminDashboard).mockReturnValue(baseDashboardData)
  })

  it('renders the page title', () => {
    renderPage()
    expect(screen.getByText('Painel Administrativo')).toBeTruthy()
  })

  it('shows loading state while dashboard data is fetching', () => {
    vi.mocked(useAdminDashboard).mockReturnValue({
      ...baseDashboardData,
      isLoading: true,
    })

    renderPage()

    expect(screen.getByRole('button', { name: 'Atualizar dados' })).toBeDisabled()
    expect(screen.getByRole('region', { name: 'Solicitações pendentes' })).toBeTruthy()
  })

  it('renders user metrics correctly', async () => {
    vi.mocked(useAdminDashboard).mockReturnValue({
      ...baseDashboardData,
      metrics: {
        ...baseDashboardData.metrics,
        totalUsers: 3,
        activeUsers: 2,
        inactiveUsers: 1,
        adminUsers: 1,
      },
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Usuários')).toBeTruthy()
      expect(screen.getByText('2 ativos (67%)')).toBeTruthy()
      expect(screen.getByText('Usuários Inativos')).toBeTruthy()
      expect(screen.getByText('Administradores')).toBeTruthy()
    })
  })

  it('renders app metrics correctly', async () => {
    vi.mocked(useAdminDashboard).mockReturnValue({
      ...baseDashboardData,
      metrics: {
        ...baseDashboardData.metrics,
        activeApps: 2,
        inactiveApps: 1,
      },
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Apps Ativos')).toBeTruthy()
      expect(screen.getByText('Apps Inativos')).toBeTruthy()
    })
  })

  it('renders pending requests in the list', async () => {
    vi.mocked(useAdminDashboard).mockReturnValue({
      ...baseDashboardData,
      pendingRequests: [makeRequest('req-1', 'Portal RH')],
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy()
      expect(screen.getByText('Portal RH')).toBeTruthy()
    })
  })

  it('shows pending requests count metric', async () => {
    vi.mocked(useAdminDashboard).mockReturnValue({
      ...baseDashboardData,
      metrics: {
        ...baseDashboardData.metrics,
        pendingRequests: 5,
      },
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Sol. Pendentes')).toBeTruthy()
      expect(screen.getByText('5')).toBeTruthy()
    })
  })

  it('renders empty state when no pending requests', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Nenhuma solicitação pendente')).toBeTruthy()
    })
  })

  it('renders recent audit log entries', async () => {
    vi.mocked(useAdminDashboard).mockReturnValue({
      ...baseDashboardData,
      recentAuditLogs: [makeLog('log-1', 'Bob', 'USER_PROMOTE_ADMIN')],
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeTruthy()
      expect(screen.getByText('Promoveu a admin')).toBeTruthy()
    })
  })

  it('renders empty state when no audit logs', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Sem atividade recente')).toBeTruthy()
    })
  })

  it('shows error banner when dashboard data fails', async () => {
    vi.mocked(useAdminDashboard).mockReturnValue({
      ...baseDashboardData,
      hasError: true,
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByText(/Alguns dados não puderam ser carregados/)).toBeTruthy()
    })
  })

  it('shows error state in list sections when dashboard data fails', async () => {
    vi.mocked(useAdminDashboard).mockReturnValue({
      ...baseDashboardData,
      hasError: true,
    })

    renderPage()

    await waitFor(() => {
      const errors = screen.getAllByText('Ocorreu um erro ao carregar os dados.')
      expect(errors.length).toBeGreaterThanOrEqual(2)
    })
  })
})
