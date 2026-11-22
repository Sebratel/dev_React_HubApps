/// <reference types="vitest/globals" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import type { UserModel, AppItemModel } from '@/types/models'

const mockUser: UserModel = {
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
  createdAt: new Date(),
  updatedAt: new Date(),
  online: false,
  lastLogin: null,
}

function makeApp(overrides: Partial<AppItemModel> = {}): AppItemModel {
  return {
    id: 'app-1',
    name: 'My App',
    icon: '🔧',
    lottie: null,
    description: 'Description',
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

const accessibleApp = makeApp({
  id: 'app-1',
  name: 'Financeiro',
  description: 'Sistema financeiro',
})
const blockedApp = makeApp({
  id: 'app-2',
  name: 'RH Portal',
  description: 'Portal de RH',
})
const embeddedApp = makeApp({
  id: 'app-3',
  name: 'Data Hub',
  description: 'Catálogo de dados',
  passToken: true,
  embed: true,
})

vi.mock('@/features/dashboard/hooks/useApps', () => ({
  useApps: () => ({
    userApps: [accessibleApp, embeddedApp],
    blockedApps: [blockedApp],
    favoriteApps: [],
    recentApps: [],
    isLoading: false,
    error: null,
  }),
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: mockUser, isLoading: false, error: null }),
}))

vi.mock('@/stores/apps.store', () => ({
  useAppsStore: (selector: (s: unknown) => unknown) =>
    selector({ favorites: [], toggleFavorite: vi.fn(), markRecent: vi.fn() }),
}))

vi.mock('@/hooks/useSecureSignOut', () => ({
  useSecureSignOut: () => vi.fn(),
}))

vi.mock('@/services/app.service', () => ({
  buildAppUrl: vi.fn().mockReturnValue('https://example.com'),
  getApps: vi.fn().mockResolvedValue([]),
  requestAppLaunchToken: vi.fn().mockResolvedValue({ token: 'token-1' }),
}))

vi.mock('@/services/audit-log.service', () => ({
  logAppOpen: vi.fn().mockResolvedValue(undefined),
  logAccessRequest: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/access-request.service', () => ({
  getPendingRequestForApp: vi.fn().mockResolvedValue(null),
  createAccessRequest: vi.fn().mockResolvedValue({ id: 'req-1' }),
  validateReason: vi.fn().mockReturnValue(null),
}))

vi.mock('@/services/manual.service', () => ({
  getManuals: vi.fn().mockResolvedValue([]),
}))

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard header and search', () => {
    render(<DashboardPage />, { wrapper: Wrapper })
    // Hero redesign replaced the "Aplicativos" heading with a welcome + subtitle.
    expect(screen.getByText('Sua biblioteca de aplicativos, tudo em um só lugar.')).toBeTruthy()
    expect(screen.getByPlaceholderText('Buscar aplicativo...')).toBeTruthy()
  })

  it('renders accessible app with Abrir button', () => {
    render(<DashboardPage />, { wrapper: Wrapper })
    expect(screen.getByText('Financeiro')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Abrir Financeiro/ })).toBeTruthy()
  })

  it('filters apps by search term', () => {
    render(<DashboardPage />, { wrapper: Wrapper })
    const input = screen.getByPlaceholderText('Buscar aplicativo...')
    fireEvent.change(input, { target: { value: 'Financeiro' } })
    expect(screen.getByText('Financeiro')).toBeTruthy()
    expect(screen.queryByText('RH Portal')).toBeNull()
  })

  it('opens an embedded app inside the Hub instead of a new tab', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const { requestAppLaunchToken } = await import('@/services/app.service')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/app/:id" element={<p>página embutida</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /^Abrir Data Hub/ }))

    await waitFor(() => expect(screen.getByText('página embutida')).toBeTruthy())
    expect(openSpy).not.toHaveBeenCalled()
    // O token SSO é pedido pela página embutida, não pelo clique.
    expect(requestAppLaunchToken).not.toHaveBeenCalled()
    openSpy.mockRestore()
  })

  it('keeps opening non-embedded apps in a new tab', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(<DashboardPage />, { wrapper: Wrapper })

    fireEvent.click(screen.getByRole('button', { name: /^Abrir Financeiro/ }))

    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer'))
    openSpy.mockRestore()
  })
})
