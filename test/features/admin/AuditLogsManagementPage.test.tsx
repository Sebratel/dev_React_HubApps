/// <reference types="vitest/globals" />
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { AuditLogsManagementPage } from '@/features/admin/audit-logs/AuditLogsManagementPage'
import type { AuditLogModel } from '@/types/models'
import type { PaginatedResponse } from '@/types/api'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/firebase', () => ({ db: {}, auth: {}, rtdb: {}, functions: {} }))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({
      user: {
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
      },
      isLoading: false,
      error: null,
    }),
}))

vi.mock('@/services/admin/admin-audit-log.service', () => ({
  listAuditLogs: vi.fn(),
}))

import { listAuditLogs } from '@/services/admin/admin-audit-log.service'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeLog(overrides: Partial<AuditLogModel> = {}): AuditLogModel {
  return {
    id:        'log-1',
    userId:    'uid-1',
    userName:  'João Silva',
    userPhotoUrl: null,
    action:    'LOGIN',
    details:   '',
    timestamp: new Date('2026-06-01T10:00:00Z'),
    ...overrides,
  }
}

function makePagedResponse(
  logs: AuditLogModel[],
  total?: number,
  offset = 0,
): PaginatedResponse<AuditLogModel> {
  return {
    data:       logs,
    pagination: { limit: 50, offset, total: total ?? logs.length },
  }
}

// ─── Wrapper ──────────────────────────────────────────────────────────────────

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

describe('AuditLogsManagementPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders page title', async () => {
    vi.mocked(listAuditLogs).mockResolvedValue(makePagedResponse([]))
    render(<AuditLogsManagementPage />, { wrapper: createWrapper() })
    expect(screen.getByText('Logs de Auditoria')).toBeTruthy()
  })

  it('shows skeleton while loading', () => {
    vi.mocked(listAuditLogs).mockImplementation(() => new Promise(() => {}))
    render(<AuditLogsManagementPage />, { wrapper: createWrapper() })
    // Table is absent while loading
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('shows error banner when list fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(listAuditLogs).mockRejectedValue(new Error('network'))
    render(<AuditLogsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByText(/Erro ao carregar logs/)).toBeTruthy()
    })
    consoleSpy.mockRestore()
  })

  it('shows empty state when no logs', async () => {
    vi.mocked(listAuditLogs).mockResolvedValue(makePagedResponse([]))
    render(<AuditLogsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() =>
      expect(screen.getByText(/Nenhum evento de auditoria/)).toBeTruthy(),
    )
  })

  it('renders log list with action badges after loading', async () => {
    vi.mocked(listAuditLogs).mockResolvedValue(
      makePagedResponse([
        makeLog({ userName: 'Maria Costa', action: 'APP_OPEN' }),
      ]),
    )
    render(<AuditLogsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Maria Costa')).toBeTruthy())
    // Badge has data-testid="action-badge-APP_OPEN" to avoid clash with <option> text
    expect(screen.getByTestId('action-badge-APP_OPEN')).toBeTruthy()
  })

  it('filters by action — passes action param to service', async () => {
    vi.mocked(listAuditLogs).mockResolvedValue(
      makePagedResponse([makeLog({ action: 'LOGIN' })]),
    )
    render(<AuditLogsManagementPage />, { wrapper: createWrapper() })
    // 'Login' appears in both the log row and the sidebar quick-actions, use getAllByText
    await waitFor(() => expect(screen.getAllByText('Login').length).toBeGreaterThan(0))

    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por ação' }), {
      target: { value: 'LOGIN' },
    })

    await waitFor(() => {
      expect(listAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN' }),
      )
    })
  })

  it('filters by period — passes date_from and date_to to service', async () => {
    vi.mocked(listAuditLogs).mockResolvedValue(makePagedResponse([makeLog()]))
    render(<AuditLogsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(listAuditLogs).toHaveBeenCalled())

    fireEvent.change(
      screen.getByRole('combobox', { name: 'Filtrar por período' }),
      { target: { value: 'today' } },
    )

    await waitFor(() => {
      expect(listAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          date_to:   expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      )
    })
  })

  it('client-side search filters rows by userName', async () => {
    vi.mocked(listAuditLogs).mockResolvedValue(
      makePagedResponse([
        makeLog({ id: 'l-1', userName: 'João Silva' }),
        makeLog({ id: 'l-2', userName: 'Maria Costa' }),
      ]),
    )
    render(<AuditLogsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('João Silva')).toBeTruthy())

    fireEvent.change(
      screen.getByPlaceholderText('Buscar por usuário ou detalhes...'),
      { target: { value: 'maria' } },
    )

    expect(screen.queryByText('João Silva')).toBeNull()
    expect(screen.getByText('Maria Costa')).toBeTruthy()
  })

  it('client-side search filters rows by details', async () => {
    vi.mocked(listAuditLogs).mockResolvedValue(
      makePagedResponse([
        makeLog({ id: 'l-1', userName: 'Ana Lima',  details: 'Portal RH' }),
        makeLog({ id: 'l-2', userName: 'Pedro Neto', details: 'CRM Vendas' }),
      ]),
    )
    render(<AuditLogsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Ana Lima')).toBeTruthy())

    fireEvent.change(
      screen.getByPlaceholderText('Buscar por usuário ou detalhes...'),
      { target: { value: 'CRM' } },
    )

    expect(screen.queryByText('Ana Lima')).toBeNull()
    expect(screen.getByText('Pedro Neto')).toBeTruthy()
  })

  it('opens details dialog when a row is clicked', async () => {
    vi.mocked(listAuditLogs).mockResolvedValue(
      makePagedResponse([makeLog({ id: 'log-42', userName: 'Alice' })]),
    )
    render(<AuditLogsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())

    fireEvent.click(screen.getByLabelText('Ver detalhes do evento log-42'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy()
      expect(
        within(screen.getByRole('dialog')).getByRole('heading', {
          name: 'Detalhes do evento',
        }),
      ).toBeTruthy()
    })
  })

  it('shows copy ID button inside details dialog', async () => {
    vi.mocked(listAuditLogs).mockResolvedValue(
      makePagedResponse([makeLog({ id: 'log-copy', userName: 'Bob' })]),
    )
    render(<AuditLogsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Bob')).toBeTruthy())

    fireEvent.click(screen.getByLabelText('Ver detalhes do evento log-copy'))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Copiar ID' }),
    ).toBeTruthy()
  })

  it('shows pagination when total exceeds page size', async () => {
    vi.mocked(listAuditLogs).mockResolvedValue(
      makePagedResponse(
        Array.from({ length: 50 }, (_, i) =>
          makeLog({ id: `l-${i}`, userName: `User ${i}` }),
        ),
        75,
      ),
    )
    render(<AuditLogsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('User 0')).toBeTruthy())

    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeTruthy()
  })

  it('navigates to next page — calls service with offset 50', async () => {
    vi.mocked(listAuditLogs).mockResolvedValue(
      makePagedResponse(
        Array.from({ length: 50 }, (_, i) =>
          makeLog({ id: `l-${i}`, userName: `User ${i}` }),
        ),
        75,
      ),
    )
    render(<AuditLogsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('User 0')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }))

    await waitFor(() => {
      expect(listAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 50, limit: 50 }),
      )
    })
  })

  it('clears all filters', async () => {
    vi.mocked(listAuditLogs).mockResolvedValue(makePagedResponse([makeLog()]))
    render(<AuditLogsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(listAuditLogs).toHaveBeenCalled())

    // Set a filter to make "Limpar filtros" appear
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por ação' }), {
      target: { value: 'LOGOUT' },
    })

    await waitFor(() =>
      expect(screen.getByText('Limpar filtros')).toBeTruthy(),
    )

    fireEvent.click(screen.getByText('Limpar filtros'))

    // After clearing, the select should return to 'all' (shows "Todas as ações")
    await waitFor(() => {
      expect(
        (screen.getByRole('combobox', { name: 'Filtrar por ação' }) as HTMLSelectElement).value,
      ).toBe('all')
    })

    // "Limpar filtros" button disappears when no active filters
    expect(screen.queryByText('Limpar filtros')).toBeNull()
  })
})
