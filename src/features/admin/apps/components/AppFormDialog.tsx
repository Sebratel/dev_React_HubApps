import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { AppIcon } from '@/components/app-icon'
import {
  appIconRegistry,
  iconColorMap,
  isRegistryIcon,
  encodeIconValue,
  parseIconValue,
  type IconColorKey,
} from '@/components/app-icon-registry'
import { cn } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AppItemModel } from '@/types/models'
import { listUsers } from '@/services/admin/admin-user.service'
import { adminGetAllTeams } from '@/services/team.service'

// ─── Schema ───────────────────────────────────────────────────────────────────

import { SEBRATEL_PROFILES } from '@/constants/profiles'

const PROFILE_OPTIONS = SEBRATEL_PROFILES

const STATUS_OPTIONS = [
  { value: 'active',      label: 'Ativo'        },
  { value: 'novo',        label: 'Novo'          },
  { value: 'maintenance', label: 'Manutenção'    },
] as const

const CARD_COLOR_OPTIONS = [
  { value: 'amber', label: 'Âmbar',  swatch: 'bg-[#FFB000]' },
  { value: 'dark',  label: 'Escuro', swatch: 'bg-[#2d1800]' },
  { value: 'muted', label: 'Cinza',  swatch: 'bg-slate-400' },
  { value: 'white', label: 'Creme',  swatch: 'bg-[#d1c9b8] border border-border' },
] as const

const appFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  url: z
    .string()
    .min(1, 'URL é obrigatória')
    .url('URL inválida. Use o formato https://exemplo.com'),
  description: z.string().max(500).optional(),
  iconUrl: z.string().optional(),
  cardColor: z.enum(['dark', 'muted', 'white', 'amber']).nullable().optional(),
  passToken: z.boolean(),
  passUser: z.boolean(),
  embed: z.boolean(),
  status: z.enum(['active', 'maintenance', 'novo']),
  allowedProfiles: z.array(z.string()),
  allowedUsers: z.array(z.string()),
  allowedTeams: z.array(z.string()),
})

export type AppFormValues = z.infer<typeof appFormSchema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppFormDialogProps {
  app?: AppItemModel
  open: boolean
  isPending: boolean
  error: string | null
  onConfirm: (values: AppFormValues) => void
  onClose: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AppFormDialog({
  app,
  open,
  isPending,
  error,
  onConfirm,
  onClose,
}: AppFormDialogProps) {
  const isEdit = !!app
  const title = isEdit ? 'Editar aplicativo' : 'Criar aplicativo'

  const [userSearch, setUserSearch] = useState('')

  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', 'all'],
    queryFn: () => listUsers({ limit: 1000 }).then((r) => r.data),
    enabled: open,
    staleTime: 2 * 60_000,
  })

  const { data: allTeams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['teams', 'all'],
    queryFn: adminGetAllTeams,
    enabled: open,
    staleTime: 5 * 60_000,
  })

  const filteredUsers = userSearch.trim()
    ? allUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearch.toLowerCase()),
      )
    : allUsers

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<AppFormValues>({
    resolver: zodResolver(appFormSchema),
    defaultValues: {
      name: app?.name ?? '',
      url: app?.url ?? '',
      description: app?.description ?? '',
      iconUrl: app?.icon ?? '',
      cardColor: (app?.cardColor as 'dark' | 'muted' | 'white' | 'amber' | null) ?? null,
      passToken: app?.passToken ?? false,
      passUser: app?.passUser ?? false,
      embed: app?.embed ?? false,
      status: (app?.status as 'active' | 'maintenance' | 'novo') ?? 'active',
      allowedProfiles: app?.allowedProfiles ?? [],
      allowedUsers: app?.allowedUsers ?? [],
      allowedTeams: app?.allowedTeams ?? [],
    },
  })

  useEffect(() => {
    if (open) {
      setUserSearch('')
      reset({
        name: app?.name ?? '',
        url: app?.url ?? '',
        description: app?.description ?? '',
        iconUrl: app?.icon ?? '',
        cardColor: (app?.cardColor as 'dark' | 'muted' | 'white' | 'amber' | null) ?? null,
        passToken: app?.passToken ?? false,
        passUser: app?.passUser ?? false,
        embed: app?.embed ?? false,
        status: (app?.status as 'active' | 'maintenance' | 'novo') ?? 'active',
        allowedProfiles: app?.allowedProfiles ?? [],
        allowedUsers: app?.allowedUsers ?? [],
        allowedTeams: app?.allowedTeams ?? [],
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, app?.id])

  const allowedProfiles = watch('allowedProfiles')
  const allowedUsers = watch('allowedUsers')
  const allowedTeams = watch('allowedTeams')

  const noAccessRules =
    allowedProfiles.length === 0 &&
    allowedUsers.length === 0 &&
    allowedTeams.length === 0

  function onSubmit(values: AppFormValues) {
    onConfirm(values)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 flex flex-col max-h-[90vh] overflow-hidden gap-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6">
        <form
          id="app-form"
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e)
          }}
          className="flex flex-col gap-4 pb-2"
          noValidate
        >
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="app-name" className="text-sm font-medium">
              Nome <span className="text-destructive">*</span>
            </label>
            <Input
              id="app-name"
              placeholder="Ex: Portal RH"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* URL */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="app-url" className="text-sm font-medium">
              URL <span className="text-destructive">*</span>
            </label>
            <Input
              id="app-url"
              type="url"
              placeholder="https://app.exemplo.com"
              aria-invalid={!!errors.url}
              {...register('url')}
            />
            {errors.url && (
              <p className="text-xs text-destructive" role="alert">
                {errors.url.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="app-desc" className="text-sm font-medium">
              Descrição
            </label>
            <textarea
              id="app-desc"
              rows={2}
              placeholder="Breve descrição do aplicativo (opcional)"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              {...register('description')}
            />
          </div>

          {/* Icon */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Ícone</span>
            <Controller
              name="iconUrl"
              control={control}
              render={({ field }) => {
                const currentVal = field.value ?? ''
                const { iconName: currentIconName, colorKey: currentColor } = parseIconValue(currentVal)
                const fromRegistry = isRegistryIcon(currentVal)

                function setIcon(name: string) {
                  if (currentIconName === name) {
                    field.onChange('')
                  } else {
                    field.onChange(encodeIconValue(name, currentColor))
                  }
                }

                function setColor(color: IconColorKey) {
                  if (fromRegistry) {
                    field.onChange(encodeIconValue(currentIconName, color))
                  }
                }

                return (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3 items-start">
                      <AppIcon icon={currentVal || '📦'} name="preview" size="lg" className="mt-5 shrink-0" />

                      <div className="flex-1 flex flex-col gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Biblioteca de ícones</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(appIconRegistry).map(([iconName, IconComp]) => (
                              <button
                                key={iconName}
                                type="button"
                                onClick={() => setIcon(iconName)}
                                className={cn(
                                  'flex items-center justify-center h-9 w-9 rounded-lg border transition-colors',
                                  currentIconName === iconName && fromRegistry
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border bg-background hover:bg-muted text-muted-foreground',
                                )}
                                aria-pressed={currentIconName === iconName && fromRegistry}
                                aria-label={`Selecionar ícone ${iconName}`}
                              >
                                <IconComp size={18} aria-hidden />
                              </button>
                            ))}
                          </div>
                        </div>

                        {fromRegistry && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Cor</p>
                            <div className="flex flex-wrap gap-2">
                              {(Object.entries(iconColorMap) as [IconColorKey, typeof iconColorMap[string]][]).map(([key, cfg]) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setColor(key)}
                                  className={cn(
                                    'h-7 w-7 rounded-full border-2 transition-transform',
                                    cfg.dot,
                                    currentColor === key
                                      ? 'border-foreground scale-110'
                                      : 'border-transparent hover:scale-105',
                                  )}
                                  aria-pressed={currentColor === key}
                                  aria-label={cfg.label}
                                  title={cfg.label}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="app-icon" className="text-xs text-muted-foreground">
                        Emoji ou URL de imagem
                      </label>
                      <Input
                        id="app-icon"
                        placeholder="📦 ou https://cdn.exemplo.com/icon.png"
                        value={fromRegistry ? '' : currentVal}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </div>
                  </div>
                )
              }}
            />
          </div>

          {/* Card Color */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Cor da faixa</span>
            <Controller
              name="cardColor"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => field.onChange(null)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-colors w-16',
                      field.value == null
                        ? 'border-primary bg-primary/10'
                        : 'border-transparent hover:bg-muted',
                    )}
                    aria-pressed={field.value == null}
                    aria-label="Cor automática (âmbar)"
                  >
                    <div className="w-full h-12 rounded-lg bg-background border border-dashed border-border relative overflow-hidden flex items-center justify-center">
                      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-[#FFB000]" />
                      <span className="text-[9px] font-bold text-muted-foreground">A</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Auto</span>
                  </button>

                  {CARD_COLOR_OPTIONS.map(({ value, label, swatch }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-colors w-16',
                        field.value === value
                          ? 'border-primary bg-primary/10'
                          : 'border-transparent hover:bg-muted',
                      )}
                      aria-pressed={field.value === value}
                      aria-label={label}
                    >
                      <div className="w-full h-12 rounded-lg bg-background border border-border relative overflow-hidden">
                        <div className={cn('absolute top-0 left-0 right-0 h-1 rounded-t-lg', swatch)} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="app-status" className="text-sm font-medium">
              Status
            </label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <select
                  id="app-status"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              )}
            />
          </div>

          {/* Flags de integração */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Integração</span>
            <Controller
              name="passToken"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="app-pass-token"
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm">
                    <span className="font-medium">SSO — passar token de sessão</span>
                    <span className="ml-1 text-xs text-muted-foreground">(passToken)</span>
                  </span>
                </label>
              )}
            />
            <Controller
              name="passUser"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="app-pass-user"
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm">
                    <span className="font-medium">Passar dados do usuário na URL</span>
                    <span className="ml-1 text-xs text-muted-foreground">(uid, nome, email)</span>
                  </span>
                </label>
              )}
            />
            <Controller
              name="embed"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="app-embed"
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm">
                    <span className="font-medium">Abrir dentro do Hub</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      (o app precisa liberar o Hub em frame-ancestors)
                    </span>
                  </span>
                </label>
              )}
            />
          </div>

          {/* Allowed Profiles */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Perfis com acesso</span>
            <Controller
              name="allowedProfiles"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-3">
                  {PROFILE_OPTIONS.map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        value={value}
                        checked={field.value.includes(value)}
                        onChange={(e) => {
                          field.onChange(
                            e.target.checked
                              ? [...field.value, value]
                              : field.value.filter((v) => v !== value)
                          )
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Allowed Users */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Usuários específicos</span>
            <Controller
              name="allowedUsers"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Input
                    placeholder="Buscar por nome ou e-mail..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  <div className="max-h-44 overflow-y-auto rounded-md border border-input bg-background divide-y divide-border">
                    {usersLoading ? (
                      <p className="px-3 py-2.5 text-sm text-muted-foreground">Carregando usuários...</p>
                    ) : filteredUsers.length === 0 ? (
                      <p className="px-3 py-2.5 text-sm text-muted-foreground">Nenhum usuário encontrado</p>
                    ) : (
                      filteredUsers.map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={field.value.includes(user.id)}
                            onChange={(e) => {
                              field.onChange(
                                e.target.checked
                                  ? [...field.value, user.id]
                                  : field.value.filter((id) => id !== user.id),
                              )
                            }}
                            className="h-4 w-4 rounded border-input shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  {field.value.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {field.value.length} usuário{field.value.length !== 1 ? 's' : ''} selecionado{field.value.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            />
          </div>

          {/* Allowed Teams */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Times com acesso</span>
            <Controller
              name="allowedTeams"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <div className="max-h-44 overflow-y-auto rounded-md border border-input bg-background divide-y divide-border">
                    {teamsLoading ? (
                      <p className="px-3 py-2.5 text-sm text-muted-foreground">Carregando times...</p>
                    ) : allTeams.length === 0 ? (
                      <p className="px-3 py-2.5 text-sm text-muted-foreground">Nenhum time cadastrado</p>
                    ) : (
                      allTeams.map((team) => (
                        <label
                          key={team.id}
                          className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={field.value.includes(team.id)}
                            onChange={(e) => {
                              field.onChange(
                                e.target.checked
                                  ? [...field.value, team.id]
                                  : field.value.filter((n) => n !== team.id),
                              )
                            }}
                            className="h-4 w-4 rounded border-input shrink-0"
                          />
                          <span className="text-sm">{team.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {field.value.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {field.value.length} time{field.value.length !== 1 ? 's' : ''} selecionado{field.value.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            />
          </div>

          {/* No access rules warning */}
          {noAccessRules && (
            <div
              role="note"
              className="rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-xs text-orange-800"
            >
              <strong>Atenção:</strong> Nenhuma regra de acesso configurada. O aplicativo ficará
              inacessível para todos os usuários até que ao menos uma regra seja adicionada.
            </div>
          )}

          {/* Mutation error */}
          {error && (
            <p
              role="alert"
              className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2"
            >
              {error}
            </p>
          )}
        </form>
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="app-form" disabled={isPending}>
            {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar aplicativo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
