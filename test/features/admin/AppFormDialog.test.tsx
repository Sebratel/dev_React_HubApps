/// <reference types="@testing-library/jest-dom" />
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { AppFormDialog } from '@/features/admin/apps/components/AppFormDialog'
import type { AppItemModel } from '@/types/models'

vi.mock('@/firebase', () => ({ db: {}, auth: {}, rtdb: {}, functions: {} }))

vi.mock('@/services/admin/admin-user.service', () => ({
  listUsers: vi.fn().mockResolvedValue({
    data: [
      { id: 'u1', name: 'Ana', email: 'ana@sebratel.com.br' },
      { id: 'u2', name: 'Bruno', email: 'bruno@sebratel.com.br' },
    ],
  }),
}))

vi.mock('@/services/team.service', () => ({
  adminGetAllTeams: vi.fn().mockResolvedValue([
    { id: 't1', name: 'Infra' },
    { id: 't2', name: 'NOC' },
  ]),
}))

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const restrictedApp = {
  id: 'a1', name: 'Splitters', url: 'https://splitters.example.com', description: '', icon: '',
  cardColor: null, passToken: true, passUser: false, embed: false, status: 'active',
  allowedProfiles: ['tecnica'], allowedUsers: ['u1'], allowedTeams: [],
} as unknown as AppItemModel

const TODOS = /Selecionar todos — toda a organização/

function renderDialog(app?: AppItemModel) {
  const onConfirm = vi.fn()
  render(
    <AppFormDialog app={app} open isPending={false} error={null} onConfirm={onConfirm} onClose={() => {}} />,
    { wrapper: Wrapper },
  )
  return { onConfirm }
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /Criar aplicativo|Salvar alterações/ }))
}

describe('AppFormDialog — quem pode abrir', () => {
  beforeEach(() => vi.clearAllMocks())

  it('app novo começa liberado para toda a organização, sem as listas', () => {
    renderDialog()
    expect(screen.getByRole('checkbox', { name: TODOS })).toBeChecked()
    expect(screen.queryByText('Perfis com acesso')).toBeNull()
  })

  it('app com regras abre com a opção desmarcada e as listas visíveis', () => {
    renderDialog(restrictedApp)
    expect(screen.getByRole('checkbox', { name: TODOS })).not.toBeChecked()
    expect(screen.getByText('Perfis com acesso')).toBeInTheDocument()
  })

  it('marcar "toda a organização" salva as três listas vazias', async () => {
    const { onConfirm } = renderDialog(restrictedApp)
    fireEvent.click(screen.getByRole('checkbox', { name: TODOS }))
    submit()
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ allowedProfiles: [], allowedUsers: [], allowedTeams: [] })
  })

  it('desmarcar de novo devolve a escolha anterior', () => {
    renderDialog(restrictedApp)
    const todos = screen.getByRole('checkbox', { name: TODOS })
    fireEvent.click(todos)
    fireEvent.click(todos)
    expect(screen.getByRole('checkbox', { name: 'Técnica' })).toBeChecked()
  })

  it('restringir sem escolher ninguém não salva e explica', async () => {
    const { onConfirm } = renderDialog(restrictedApp)
    fireEvent.click(screen.getByRole('checkbox', { name: TODOS }))
    fireEvent.click(screen.getByRole('checkbox', { name: TODOS }))
    // limpa perfis e usuários
    for (const limpar of screen.getAllByRole('button', { name: 'Limpar' })) fireEvent.click(limpar)
    submit()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Escolha ao menos um perfil/))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('"Selecionar todos" marca todos os perfis, usuários e times', async () => {
    const { onConfirm } = renderDialog(restrictedApp)
    await screen.findByText('Ana')
    await screen.findByText('NOC')
    for (const btn of screen.getAllByRole('button', { name: /^Selecionar todos/ })) fireEvent.click(btn)
    submit()
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
    const values = onConfirm.mock.calls[0][0]
    expect(values.allowedProfiles).toEqual(['tecnica', 'atendimento', 'comercial', 'users'])
    expect([...values.allowedUsers].sort()).toEqual(['u1', 'u2'])
    expect(values.allowedTeams).toEqual(['t1', 't2'])
  })
})
