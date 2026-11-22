/// <reference types="vitest/globals" />
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect } from 'vitest'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import type { UserModel } from '@/types/models'

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

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ user: mockUser, setUser: vi.fn() }),
}))
vi.mock('@/stores/notifications.store', () => ({
  useNotificationsStore: (selector: (s: unknown) => unknown) => selector({ readAnnouncementIds: [] }),
}))
vi.mock('@/hooks/useSecureSignOut', () => ({ useSecureSignOut: () => vi.fn() }))
vi.mock('@/hooks/useHeartbeat', () => ({ useHeartbeat: () => undefined }))
vi.mock('@/utils/permissions', () => ({ canAccessAdminDashboard: () => false }))
vi.mock('@/services/user.service', () => ({ updateMyStatus: vi.fn() }))
vi.mock('@/services/announcement.service', () => ({ getAnnouncements: vi.fn().mockResolvedValue([]) }))
vi.mock('@/services/access-request.service', () => ({ getUserAccessRequests: vi.fn().mockResolvedValue([]) }))
vi.mock('@/services/kudos.service', () => ({ getCelebrations: vi.fn().mockResolvedValue([]) }))
vi.mock('@/features/kudos/SendKudoDialog', () => ({ SendKudoDialog: () => null }))
// UserAvatar usa resolveAssetUrl; o lib/api real inicializaria o Firebase.
vi.mock('@/lib/api', () => ({ resolveAssetUrl: (u: string | null) => u }))

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Link to="/app/datahub">abrir app</Link>} />
            <Route path="/app/:id" element={<Link to="/">sair do app</Link>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const menu = () => screen.getByRole('complementary', { name: 'Navegação principal' })

describe('DashboardLayout — menu recolhido', () => {
  it('fica expandido nas telas do Hub', () => {
    renderAt('/')
    expect(menu().getAttribute('data-collapsed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Recolher menu' })).toBeTruthy()
  })

  it('recolhe sozinho ao abrir um app embutido', () => {
    renderAt('/app/datahub')
    expect(menu().getAttribute('data-collapsed')).toBe('true')
    // recolhido, cada item mostra o nome como dica
    expect(screen.getByRole('link', { name: /Aplicativos/ }).getAttribute('title')).toBe('Aplicativos')
  })

  it('o botão expande e recolhe à mão', () => {
    renderAt('/app/datahub')
    fireEvent.click(screen.getByRole('button', { name: 'Expandir menu' }))
    expect(menu().getAttribute('data-collapsed')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }))
    expect(menu().getAttribute('data-collapsed')).toBe('true')
  })

  it('entra recolhido no app e volta expandido ao sair', () => {
    renderAt('/')
    fireEvent.click(screen.getByText('abrir app'))
    expect(menu().getAttribute('data-collapsed')).toBe('true')
    fireEvent.click(screen.getByText('sair do app'))
    expect(menu().getAttribute('data-collapsed')).toBe('false')
  })
})
