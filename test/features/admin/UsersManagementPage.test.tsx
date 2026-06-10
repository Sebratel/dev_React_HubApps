/// <reference types="vitest/globals" />
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { UsersManagementPage } from '@/features/admin/users/UsersManagementPage'
import type { UserModel } from '@/types/models'
import { ApiError } from '@/types/api'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/firebase', () => ({ db: {}, auth: {}, rtdb: {}, functions: {} }))

const mockAdminUser: UserModel = {
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

vi.mock('@/services/admin/admin-user.service', () => ({
  listUsers: vi.fn(),
  activateUser: vi.fn(),
  deactivateUser: vi.fn(),
  promoteToAdmin: vi.fn(),
  revokeAdmin: vi.fn(),
  updateUserProfile: vi.fn(),
}))

// Radix UI DropdownMenu does not render its Portal in jsdom via fireEvent.
// Replace UserActionsMenu with flat buttons so we can test page-level behaviour
// (dialog open/close, mutations called) without fighting the portal mechanism.
vi.mock('@/features/admin/users/components/UserActionsMenu', () => ({
  UserActionsMenu: ({
    user,
    currentUserId,
    onEdit,
    onActivate,
    onDeactivate,
    onPromoteAdmin,
    onRevokeAdmin,
  }: {
    user: UserModel
    currentUserId: string
    onEdit: () => void
    onActivate: () => void
    onDeactivate: () => void
    onPromoteAdmin: () => void
    onRevokeAdmin: () => void
  }) => {
    const isSelf = user.id === currentUserId
    return (
      <div data-testid={`actions-${user.id}`}>
        <button onClick={onEdit}>Editar perfil</button>
        {user.isActive ? (
          <button onClick={onDeactivate}>Desativar</button>
        ) : (
          <button onClick={onActivate}>Ativar</button>
        )}
        {user.isAdmin ? (
          <button
            aria-disabled={isSelf}
            data-disabled={isSelf ? '' : undefined}
            onClick={isSelf ? undefined : onRevokeAdmin}
          >
            Revogar admin
          </button>
        ) : (
          <button
            aria-disabled={isSelf}
            onClick={isSelf ? undefined : onPromoteAdmin}
          >
            Promover a admin
          </button>
        )}
      </div>
    )
  },
}))

import {
  listUsers,
  activateUser,
  deactivateUser,
  promoteToAdmin,
} from '@/services/admin/admin-user.service'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<UserModel> = {}): UserModel {
  return {
    id: 'u-1',
    email: 'alice@sebratel.com.br',
    name: 'Alice',
    photoUrl: null,
    profile: 'employee',
    team: null,
    permissions: [],
    isActive: true,
    isAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    online: false,
    lastLogin: null,
    ...overrides,
  }
}

function paginated(users: UserModel[]) {
  return { data: users, pagination: { limit: 500, offset: 0, total: users.length } }
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

describe('UsersManagementPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders page title', async () => {
    vi.mocked(listUsers).mockResolvedValue(paginated([]))
    render(<UsersManagementPage />, { wrapper: createWrapper() })
    expect(screen.getByText('Usuários')).toBeTruthy()
  })

  it('shows skeleton while loading', () => {
    vi.mocked(listUsers).mockImplementation(() => new Promise(() => {}))
    render(<UsersManagementPage />, { wrapper: createWrapper() })
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('shows error banner when list request fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(listUsers).mockRejectedValue(new Error('network error'))
    render(<UsersManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByText(/Erro ao carregar usuários/)).toBeTruthy()
    })
    consoleSpy.mockRestore()
  })

  it('shows empty state when no users', async () => {
    vi.mocked(listUsers).mockResolvedValue(paginated([]))
    render(<UsersManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Nenhum usuário cadastrado.')).toBeTruthy()
    })
  })

  it('renders user list after loading', async () => {
    vi.mocked(listUsers).mockResolvedValue(paginated([makeUser({ name: 'Alice' })]))
    render(<UsersManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy()
      expect(screen.getByText('alice@sebratel.com.br')).toBeTruthy()
    })
  })

  it('filters by search term (name)', async () => {
    vi.mocked(listUsers).mockResolvedValue(
      paginated([
        makeUser({ id: 'u-1', name: 'Alice', email: 'alice@sebratel.com.br' }),
        makeUser({ id: 'u-2', name: 'Bob', email: 'bob@sebratel.com.br' }),
      ]),
    )
    render(<UsersManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())

    fireEvent.change(screen.getByPlaceholderText('Buscar por nome ou e-mail...'), {
      target: { value: 'alice' },
    })

    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.queryByText('Bob')).toBeNull()
  })

  it('filters by status (inactive)', async () => {
    vi.mocked(listUsers).mockResolvedValue(
      paginated([
        makeUser({ id: 'u-1', name: 'Alice', isActive: true }),
        makeUser({ id: 'u-2', name: 'Bob', isActive: false }),
      ]),
    )
    render(<UsersManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())

    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por status' }), {
      target: { value: 'inactive' },
    })

    expect(screen.queryByText('Alice')).toBeNull()
    expect(screen.getByText('Bob')).toBeTruthy()
  })

  it('filters admins by role', async () => {
    vi.mocked(listUsers).mockResolvedValue(
      paginated([
        makeUser({ id: 'u-1', name: 'Alice', isAdmin: false }),
        makeUser({ id: 'u-2', name: 'Bob', isAdmin: true }),
      ]),
    )
    render(<UsersManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy())

    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por papel' }), {
      target: { value: 'admin' },
    })

    expect(screen.queryByText('Alice')).toBeNull()
    expect(screen.getByText('Bob')).toBeTruthy()
  })

  it('activate action opens confirmation dialog and calls service', async () => {
    vi.mocked(listUsers).mockResolvedValue(
      paginated([makeUser({ id: 'u-inactive', name: 'Carol', isActive: false })]),
    )
    vi.mocked(activateUser).mockResolvedValue(
      makeUser({ id: 'u-inactive', name: 'Carol', isActive: true }),
    )

    render(<UsersManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Carol')).toBeTruthy())

    // Click action button directly (UserActionsMenu is mocked with flat buttons)
    fireEvent.click(screen.getByText('Ativar'))

    // Confirmation dialog opens
    await waitFor(() => expect(screen.getByText('Ativar usuário')).toBeTruthy())

    // Confirm — scope to dialog to avoid matching the flat "Ativar" action button in the table
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ativar' }))

    await waitFor(() => {
      // TanStack Query v5 passes (variables, mutationFnContext) — assert only on the first arg
      expect(activateUser).toHaveBeenCalledWith('u-inactive', expect.any(Object))
    })
  })

  it('deactivate action opens dialog with access-loss warning', async () => {
    vi.mocked(listUsers).mockResolvedValue(
      paginated([makeUser({ id: 'u-active', name: 'Dave', isActive: true })]),
    )
    vi.mocked(deactivateUser).mockResolvedValue(
      makeUser({ id: 'u-active', name: 'Dave', isActive: false }),
    )

    render(<UsersManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Dave')).toBeTruthy())

    fireEvent.click(screen.getByText('Desativar'))

    await waitFor(() => {
      expect(screen.getByText(/perderá todo o acesso/)).toBeTruthy()
    })
  })

  it('blocks admin self-change — promote/revoke is aria-disabled for current user', async () => {
    // currentUser = 'uid-admin'; admin user in the list with the same id
    vi.mocked(listUsers).mockResolvedValue(
      paginated([makeUser({ id: 'uid-admin', name: 'Admin', isAdmin: true })]),
    )

    render(<UsersManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Admin')).toBeTruthy())

    const revokeBtn = screen.getByText('Revogar admin')
    expect(revokeBtn.getAttribute('aria-disabled')).toBe('true')
  })

  it('displays 403 error message inside activate dialog', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(listUsers).mockResolvedValue(
      paginated([makeUser({ id: 'u-1', name: 'Eve', isActive: false })]),
    )
    vi.mocked(activateUser).mockRejectedValue(
      new ApiError('Acesso restrito a administradores', 403),
    )

    render(<UsersManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Eve')).toBeTruthy())

    // Open dialog
    fireEvent.click(screen.getByText('Ativar'))
    await waitFor(() => expect(screen.getByText('Ativar usuário')).toBeTruthy())

    // Confirm → triggers mutation that rejects with 403
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ativar' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByText(/Acesso negado/)).toBeTruthy()
    })

    consoleSpy.mockRestore()
  })

  it('promote admin action requires confirmation and calls service', async () => {
    vi.mocked(listUsers).mockResolvedValue(
      paginated([makeUser({ id: 'u-2', name: 'Frank', isAdmin: false })]),
    )
    vi.mocked(promoteToAdmin).mockResolvedValue(makeUser({ id: 'u-2', name: 'Frank', isAdmin: true }))

    render(<UsersManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Frank')).toBeTruthy())

    fireEvent.click(screen.getByText('Promover a admin'))

    await waitFor(() =>
      expect(screen.getByText(/promover Frank a administrador/i)).toBeTruthy(),
    )

    // Scope to dialog — table also has a "Promover a admin" flat button for Frank
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Promover a admin' }))

    await waitFor(() => {
      expect(promoteToAdmin).toHaveBeenCalledWith('u-2', expect.any(Object))
    })
  })
})
