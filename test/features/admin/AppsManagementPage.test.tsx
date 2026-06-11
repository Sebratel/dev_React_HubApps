/// <reference types="vitest/globals" />
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { AppsManagementPage } from '@/features/admin/apps/AppsManagementPage'
import type { AppItemModel } from '@/types/models'
import { ApiError } from '@/types/api'

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

vi.mock('@/services/admin/admin-app.service', () => ({
  listAllApps:   vi.fn(),
  createApp:     vi.fn(),
  updateApp:     vi.fn(),
  deactivateApp: vi.fn(),
  reactivateApp: vi.fn(),
}))

// Radix DropdownMenu does not render its portal in jsdom via fireEvent.
// Replace AppActionsMenu with flat buttons to test page-level behaviour.
vi.mock('@/features/admin/apps/components/AppActionsMenu', () => ({
  AppActionsMenu: ({
    app,
    onEdit,
    onDeactivate,
    onReactivate,
  }: {
    app: AppItemModel
    onEdit: () => void
    onDeactivate: () => void
    onReactivate: () => void
  }) => (
    <div data-testid={`actions-${app.id}`}>
      <button onClick={onEdit}>Editar-{app.id}</button>
      {app.status === 'active' ? (
        <button onClick={onDeactivate}>Desativar-{app.id}</button>
      ) : (
        <button onClick={onReactivate}>Reativar-{app.id}</button>
      )}
    </div>
  ),
}))

import {
  listAllApps,
  createApp,
  updateApp,
  deactivateApp,
  reactivateApp,
} from '@/services/admin/admin-app.service'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeApp(overrides: Partial<AppItemModel> = {}): AppItemModel {
  return {
    id:                    'app-1',
    name:                  'Portal RH',
    icon:                  '📦',
    lottie:                null,
    description:           'Sistema de RH',
    type:                  'internal',
    launchMode:            'url',
    deepLink:              null,
    openInExternalBrowser: false,
    passUser:              false,
    passToken:             false,
    url:                   'https://rh.empresa.com',
    route:                 null,
    allowedProfiles:       ['employee'],
    allowedUsers:          [],
    allowedTeams:          [],
    status:                'active',
    createdAt:             new Date(),
    updatedAt:             new Date(),
    ...overrides,
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

// Helper: open the Criar app dialog
async function openCreateDialog() {
  fireEvent.click(screen.getByText('Criar app'))
  await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AppsManagementPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders page title', async () => {
    vi.mocked(listAllApps).mockResolvedValue([])
    render(<AppsManagementPage />, { wrapper: createWrapper() })
    expect(screen.getByText('Aplicativos')).toBeTruthy()
  })

  it('shows skeleton while loading', () => {
    vi.mocked(listAllApps).mockImplementation(() => new Promise(() => {}))
    render(<AppsManagementPage />, { wrapper: createWrapper() })
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('shows error banner when list fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(listAllApps).mockRejectedValue(new Error('network'))
    render(<AppsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByText(/Erro ao carregar aplicativos/)).toBeTruthy()
    })
    consoleSpy.mockRestore()
  })

  it('shows empty state when no apps', async () => {
    vi.mocked(listAllApps).mockResolvedValue([])
    render(<AppsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Nenhum aplicativo cadastrado.')).toBeTruthy())
  })

  it('renders app list after loading', async () => {
    vi.mocked(listAllApps).mockResolvedValue([makeApp({ name: 'Portal RH' })])
    render(<AppsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Portal RH')).toBeTruthy())
  })

  it('filters by search (name)', async () => {
    vi.mocked(listAllApps).mockResolvedValue([
      makeApp({ id: 'a-1', name: 'Portal RH' }),
      makeApp({ id: 'a-2', name: 'CRM Vendas', url: 'https://crm.com' }),
    ])
    render(<AppsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Portal RH')).toBeTruthy())

    fireEvent.change(
      screen.getByPlaceholderText('Buscar por nome, descrição ou URL...'),
      { target: { value: 'crm' } },
    )

    expect(screen.queryByText('Portal RH')).toBeNull()
    expect(screen.getByText('CRM Vendas')).toBeTruthy()
  })

  it('filters by status (inactive)', async () => {
    vi.mocked(listAllApps).mockResolvedValue([
      makeApp({ id: 'a-1', name: 'Portal RH', status: 'active' }),
      makeApp({ id: 'a-2', name: 'CRM Legado', status: 'maintenance' }),
    ])
    render(<AppsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Portal RH')).toBeTruthy())

    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por status' }), {
      target: { value: 'inactive' },
    })

    expect(screen.queryByText('Portal RH')).toBeNull()
    expect(screen.getByText('CRM Legado')).toBeTruthy()
  })

  it('opens create dialog when "Criar app" is clicked', async () => {
    vi.mocked(listAllApps).mockResolvedValue([])
    render(<AppsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Nenhum aplicativo cadastrado.')).toBeTruthy())

    await openCreateDialog()

    // Dialog title and submit button both say "Criar aplicativo" — scope to heading
    expect(within(screen.getByRole('dialog')).getByRole('heading', { name: 'Criar aplicativo' })).toBeTruthy()
  })

  it('creates app — fills form and calls service', async () => {
    vi.mocked(listAllApps).mockResolvedValue([])
    vi.mocked(createApp).mockResolvedValue(makeApp({ name: 'Novo App' }))

    render(<AppsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Nenhum aplicativo cadastrado.')).toBeTruthy())

    await openCreateDialog()

    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Nome/), { target: { value: 'Novo App' } })
    fireEvent.change(within(dialog).getByRole('textbox', { name: /^URL/ }), { target: { value: 'https://novo.app.com' } })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar aplicativo' }))

    await waitFor(() => {
      // createMutation wraps createApp: (payload) => createApp(payload)
      // so createApp only receives the payload — no TanStack context forwarded
      expect(createApp).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Novo App', url: 'https://novo.app.com' }),
      )
    })
  })

  it('shows URL validation error when URL is invalid', async () => {
    vi.mocked(listAllApps).mockResolvedValue([])
    render(<AppsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Nenhum aplicativo cadastrado.')).toBeTruthy())

    await openCreateDialog()

    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Nome/), { target: { value: 'Teste' } })
    fireEvent.change(within(dialog).getByRole('textbox', { name: /^URL/ }), { target: { value: 'nao-e-uma-url' } })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar aplicativo' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByText(/URL inválida/)).toBeTruthy()
    })

    expect(createApp).not.toHaveBeenCalled()
  })

  it('shows passToken checkbox in create dialog', async () => {
    vi.mocked(listAllApps).mockResolvedValue([])
    render(<AppsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Nenhum aplicativo cadastrado.')).toBeTruthy())

    await openCreateDialog()

    expect(screen.getByLabelText(/SSO.*passar token de sessão/i)).toBeTruthy()
    expect(screen.getByLabelText(/Passar dados do usuário na URL/i)).toBeTruthy()
  })

  it('edits app — opens dialog pre-filled and calls updateApp', async () => {
    const app = makeApp({ id: 'app-edit', name: 'Portal RH', url: 'https://rh.com' })
    vi.mocked(listAllApps).mockResolvedValue([app])
    vi.mocked(updateApp).mockResolvedValue({ ...app, name: 'Portal RH v2' })

    render(<AppsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Portal RH')).toBeTruthy())

    fireEvent.click(screen.getByText('Editar-app-edit'))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())

    // Wait for useEffect to reset form with app data
    await waitFor(() => {
      expect((screen.getByLabelText(/Nome/) as HTMLInputElement).value).toBe('Portal RH')
    })

    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Nome/), { target: { value: 'Portal RH v2' } })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }))

    // updateApp is called directly with (appId, payload) — only 2 args;
    // TanStack Query context is absorbed by the mutationFn wrapper in useAppsPage
    await waitFor(() => {
      expect(updateApp).toHaveBeenCalledWith(
        'app-edit',
        expect.objectContaining({ name: 'Portal RH v2' }),
      )
    })
  })

  it('deactivates app — opens confirm dialog and calls service', async () => {
    const app = makeApp({ id: 'app-deact', name: 'Portal RH', status: 'active' })
    vi.mocked(listAllApps).mockResolvedValue([app])
    vi.mocked(deactivateApp).mockResolvedValue({ ...app, status: 'maintenance' })

    render(<AppsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Portal RH')).toBeTruthy())

    fireEvent.click(screen.getByText('Desativar-app-deact'))
    await waitFor(() => expect(screen.getByText('Desativar aplicativo')).toBeTruthy())

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Desativar' }))

    await waitFor(() => {
      expect(deactivateApp).toHaveBeenCalledWith('app-deact', expect.any(Object))
    })
  })

  it('reactivates app — opens confirm dialog and calls service', async () => {
    const app = makeApp({ id: 'app-react', name: 'CRM Legado', status: 'maintenance' })
    vi.mocked(listAllApps).mockResolvedValue([app])
    vi.mocked(reactivateApp).mockResolvedValue({ ...app, status: 'active' })

    render(<AppsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('CRM Legado')).toBeTruthy())

    fireEvent.click(screen.getByText('Reativar-app-react'))
    await waitFor(() => expect(screen.getByText('Reativar aplicativo')).toBeTruthy())

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reativar' }))

    await waitFor(() => {
      expect(reactivateApp).toHaveBeenCalledWith('app-react', expect.any(Object))
    })
  })

  it('shows 403 error inside form dialog', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(listAllApps).mockResolvedValue([])
    vi.mocked(createApp).mockRejectedValue(new ApiError('Forbidden', 403))

    render(<AppsManagementPage />, { wrapper: createWrapper() })
    await waitFor(() => expect(screen.getByText('Nenhum aplicativo cadastrado.')).toBeTruthy())

    await openCreateDialog()

    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Nome/), { target: { value: 'App Bloqueado' } })
    fireEvent.change(within(dialog).getByRole('textbox', { name: /^URL/ }), { target: { value: 'https://blocked.com' } })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar aplicativo' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByText(/Acesso negado/)).toBeTruthy()
    })

    consoleSpy.mockRestore()
  })
})
