/// <reference types="vitest/globals" />
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { AccessRequestsManagementPage } from '@/features/admin/access-requests/AccessRequestsManagementPage'
import type { AccessRequestModel } from '@/types/models'
import { ApiError } from '@/types/api'

vi.mock('@/firebase', () => ({ db: {}, auth: {}, rtdb: {}, functions: {} }))

const mockAdminUser = {
  id: 'uid-admin',
  email: 'admin@sebratel.com.br',
  name: 'Admin',
  photoUrl: null,
  profile: 'employee',
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

vi.mock('@/services/admin/admin-access-request.service', () => ({
  listAllAccessRequests: vi.fn(),
  approveRequest: vi.fn(),
  rejectRequest: vi.fn(),
}))

import {
  listAllAccessRequests,
  approveRequest,
  rejectRequest,
} from '@/services/admin/admin-access-request.service'

function makeRequest(overrides: Partial<AccessRequestModel> = {}): AccessRequestModel {
  return {
    id: 'req-1',
    userId: 'u-1',
    userName: 'Alice',
    userPhotoUrl: null,
    email: 'alice@sebratel.com.br',
    teamId: null,
    teamName: '',
    appId: 'app-1',
    appName: 'Portal RH',
    reason: 'Preciso acessar para trabalho.',
    status: 'pending',
    // Use a recent date so the "overdue" alert (>3 days) does not appear in tests
    requestedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    updatedAt:   new Date(Date.now() - 60 * 60 * 1000),
    reviewedByUserId: null,
    reviewedByName: null,
    reviewedAt: null,
    reviewNote: null,
    ...overrides,
  }
}

function paginated(requests: AccessRequestModel[]) {
  return { data: requests, pagination: { limit: 200, offset: 0, total: requests.length } }
}

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

describe('AccessRequestsManagementPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders page title', async () => {
    vi.mocked(listAllAccessRequests).mockResolvedValue(paginated([]))
    render(<AccessRequestsManagementPage />, { wrapper: createWrapper() })
    expect(screen.getByText('Solicitações de Acesso')).toBeTruthy()
  })

  it('shows skeleton while loading', () => {
    vi.mocked(listAllAccessRequests).mockImplementation(() => new Promise(() => {}))
    render(<AccessRequestsManagementPage />, { wrapper: createWrapper() })
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('shows error banner when list request fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(listAllAccessRequests).mockRejectedValue(new Error('network error'))
    render(<AccessRequestsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByText(/Erro ao carregar solicitações/)).toBeTruthy()
    })
    consoleSpy.mockRestore()
  })

  it('shows empty state when no requests', async () => {
    vi.mocked(listAllAccessRequests).mockResolvedValue(paginated([]))
    render(<AccessRequestsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Nenhuma solicitação cadastrada.')).toBeTruthy()
    })
  })

  it('renders request list after loading', async () => {
    vi.mocked(listAllAccessRequests).mockResolvedValue(
      paginated([makeRequest({ userName: 'Alice', appName: 'Portal RH' })]),
    )
    render(<AccessRequestsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy()
      // 'Portal RH' may appear multiple times (table row + insights mini-bar)
      expect(screen.getAllByText('Portal RH').length).toBeGreaterThan(0)
    })
  })

  it('filters by status (pending only)', async () => {
    vi.mocked(listAllAccessRequests).mockResolvedValue(
      paginated([
        makeRequest({ id: 'r-1', userName: 'Alice', status: 'pending' }),
        makeRequest({
          id: 'r-2',
          userName: 'Bob',
          appName: 'CRM',
          status: 'approved',
          reviewedByUserId: 'uid-admin',
          reviewedAt: new Date(),
        }),
      ]),
    )
    render(<AccessRequestsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())

    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por status' }), {
      target: { value: 'pending' },
    })

    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.queryByText('Bob')).toBeNull()
  })

  it('filters by search (app name)', async () => {
    vi.mocked(listAllAccessRequests).mockResolvedValue(
      paginated([
        makeRequest({ id: 'r-1', userName: 'Alice', appName: 'Portal RH' }),
        makeRequest({ id: 'r-2', userName: 'Bob', appName: 'CRM Vendas' }),
      ]),
    )
    render(<AccessRequestsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())

    fireEvent.change(screen.getByPlaceholderText('Buscar por usuário, e-mail ou aplicativo...'), {
      target: { value: 'crm' },
    })

    expect(screen.queryByText('Alice')).toBeNull()
    expect(screen.getByText('Bob')).toBeTruthy()
  })

  it('filters by search (user name)', async () => {
    vi.mocked(listAllAccessRequests).mockResolvedValue(
      paginated([
        makeRequest({ id: 'r-1', userName: 'Alice', appName: 'Portal RH' }),
        makeRequest({ id: 'r-2', userName: 'Carlos', appName: 'CRM' }),
      ]),
    )
    render(<AccessRequestsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())

    fireEvent.change(screen.getByPlaceholderText('Buscar por usuário, e-mail ou aplicativo...'), {
      target: { value: 'carlos' },
    })

    expect(screen.queryByText('Alice')).toBeNull()
    expect(screen.getByText('Carlos')).toBeTruthy()
  })

  it('approve action opens confirmation dialog and calls service', async () => {
    vi.mocked(listAllAccessRequests).mockResolvedValue(
      paginated([makeRequest({ id: 'req-pending', userName: 'Alice', status: 'pending' })]),
    )
    vi.mocked(approveRequest).mockResolvedValue(
      makeRequest({ id: 'req-pending', status: 'approved', reviewedByUserId: 'uid-admin' }),
    )

    render(<AccessRequestsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())

    fireEvent.click(screen.getByText('Aprovar'))

    await waitFor(() => expect(screen.getByText('Aprovar solicitação')).toBeTruthy())

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprovar' }))

    await waitFor(() => {
      expect(approveRequest).toHaveBeenCalledWith('req-pending', expect.any(Object))
    })
  })

  it('reject action opens confirmation dialog with irreversible warning', async () => {
    vi.mocked(listAllAccessRequests).mockResolvedValue(
      paginated([makeRequest({ id: 'req-1', userName: 'Bob', status: 'pending' })]),
    )
    vi.mocked(rejectRequest).mockResolvedValue(
      makeRequest({ id: 'req-1', status: 'rejected', reviewedByUserId: 'uid-admin' }),
    )

    render(<AccessRequestsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Bob')).toBeTruthy())

    fireEvent.click(screen.getByText('Rejeitar'))

    await waitFor(() => {
      expect(screen.getByText('Rejeitar solicitação')).toBeTruthy()
      expect(screen.getByText(/Esta ação é irreversível/)).toBeTruthy()
    })

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rejeitar' }))

    await waitFor(() => {
      expect(rejectRequest).toHaveBeenCalledWith('req-1', '')
    })
  })

  it('displays 409 error inside approve dialog', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(listAllAccessRequests).mockResolvedValue(
      paginated([makeRequest({ id: 'req-conflict', status: 'pending' })]),
    )
    vi.mocked(approveRequest).mockRejectedValue(
      new ApiError('Solicitação já foi processada', 409),
    )

    render(<AccessRequestsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())

    fireEvent.click(screen.getByText('Aprovar'))
    await waitFor(() => expect(screen.getByText('Aprovar solicitação')).toBeTruthy())

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Aprovar' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByText(/já foi processada por outro administrador/)).toBeTruthy()
    })

    consoleSpy.mockRestore()
  })

  it('does not show Aprovar/Rejeitar buttons for already-processed requests', async () => {
    vi.mocked(listAllAccessRequests).mockResolvedValue(
      paginated([
        makeRequest({
          id: 'req-done',
          status: 'approved',
          reviewedByUserId: 'uid-admin',
          reviewedAt: new Date(),
        }),
      ]),
    )

    render(<AccessRequestsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())

    expect(screen.queryByText('Aprovar')).toBeNull()
    expect(screen.queryByText('Rejeitar')).toBeNull()
  })

  it('details dialog opens for any request', async () => {
    vi.mocked(listAllAccessRequests).mockResolvedValue(
      paginated([makeRequest({ appName: 'Portal RH', reason: 'Motivo detalhado aqui.' })]),
    )

    render(<AccessRequestsManagementPage />, { wrapper: createWrapper() })
    // 'Portal RH' may appear in multiple places (table + insights panel)
    await waitFor(() => expect(screen.getAllByText('Portal RH').length).toBeGreaterThan(0))

    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Portal RH' }))

    await waitFor(() => {
      expect(screen.getByText('Detalhes da solicitação')).toBeTruthy()
      expect(screen.getByText('Motivo detalhado aqui.')).toBeTruthy()
    })
  })

  it('clear filters button resets search and status', async () => {
    vi.mocked(listAllAccessRequests).mockResolvedValue(
      paginated([
        makeRequest({ id: 'r-1', userName: 'Alice', status: 'pending' }),
        makeRequest({
          id: 'r-2',
          userName: 'Bob',
          appName: 'CRM',
          status: 'approved',
          reviewedByUserId: 'uid-admin',
          reviewedAt: new Date(),
        }),
      ]),
    )
    render(<AccessRequestsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())

    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por status' }), {
      target: { value: 'pending' },
    })
    expect(screen.queryByText('Bob')).toBeNull()

    fireEvent.click(screen.getByText('Limpar filtros'))
    expect(screen.getByText('Bob')).toBeTruthy()
  })
})
