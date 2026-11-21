/// <reference types="vitest/globals" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { EmbeddedAppPage } from '@/features/app-embed/EmbeddedAppPage'
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
    id: 'datahub',
    name: 'Data Hub',
    icon: '📊',
    lottie: null,
    description: '',
    type: 'internal',
    launchMode: 'url',
    deepLink: null,
    openInExternalBrowser: false,
    passUser: false,
    passToken: true,
    embed: true,
    url: 'https://data-hub.sebratel.net.br',
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

const state = vi.hoisted(() => ({
  apps: [] as AppItemModel[],
  isLoading: false,
}))

vi.mock('@/features/dashboard/hooks/useApps', () => ({
  useApps: () => ({ userApps: state.apps, isLoading: state.isLoading }),
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ user: mockUser }),
}))

const resolveLaunchUrl = vi.hoisted(() => vi.fn())
vi.mock('@/services/app.service', () => ({ resolveLaunchUrl }))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>lista de apps</p>} />
        <Route path="/app/:id" element={<EmbeddedAppPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('EmbeddedAppPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.apps = [makeApp()]
    state.isLoading = false
    resolveLaunchUrl.mockResolvedValue('https://data-hub.sebratel.net.br?sso_token=tok-1')
  })

  it('renders the app in an iframe with the SSO token', async () => {
    renderAt('/app/datahub')

    const frame = await screen.findByTitle('Data Hub')
    expect(frame.tagName).toBe('IFRAME')
    expect(frame.getAttribute('src')).toBe('https://data-hub.sebratel.net.br?sso_token=tok-1')
    expect(resolveLaunchUrl).toHaveBeenCalledTimes(1)
    expect(resolveLaunchUrl.mock.calls[0][0].id).toBe('datahub')
  })

  it('asks for a new token when the user reloads', async () => {
    renderAt('/app/datahub')
    await screen.findByTitle('Data Hub')
    resolveLaunchUrl.mockResolvedValueOnce('https://data-hub.sebratel.net.br?sso_token=tok-2')

    fireEvent.click(screen.getByRole('button', { name: 'Recarregar aplicativo' }))

    await waitFor(() =>
      expect(screen.getByTitle('Data Hub').getAttribute('src')).toBe('https://data-hub.sebratel.net.br?sso_token=tok-2')
    )
    expect(resolveLaunchUrl).toHaveBeenCalledTimes(2)
  })

  it('shows the error when the token cannot be issued', async () => {
    resolveLaunchUrl.mockRejectedValue(new Error('Você não tem permissão para acessar este aplicativo'))
    renderAt('/app/datahub')

    expect(await screen.findByRole('alert')).toHaveTextContent('Você não tem permissão')
    expect(screen.queryByTitle('Data Hub')).toBeNull()
  })

  it('says the app was not found when the user has no access to it', () => {
    state.apps = []
    renderAt('/app/datahub')

    expect(screen.getByText('Aplicativo não encontrado ou sem acesso.')).toBeTruthy()
    expect(resolveLaunchUrl).not.toHaveBeenCalled()
  })

  it('does not frame apps that are not marked to embed', () => {
    state.apps = [makeApp({ embed: false })]
    renderAt('/app/datahub')

    expect(screen.getByText('Este aplicativo abre em uma aba separada.')).toBeTruthy()
    expect(screen.queryByTitle('Data Hub')).toBeNull()
    expect(resolveLaunchUrl).not.toHaveBeenCalled()
  })

  it('goes back to the app list', async () => {
    renderAt('/app/datahub')
    await screen.findByTitle('Data Hub')

    fireEvent.click(screen.getByRole('button', { name: 'Voltar para os aplicativos' }))

    expect(screen.getByText('lista de apps')).toBeTruthy()
  })
})
