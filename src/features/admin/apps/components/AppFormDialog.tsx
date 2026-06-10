import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
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

// ─── Schema ───────────────────────────────────────────────────────────────────

const PROFILE_OPTIONS = [
  { value: 'employee',    label: 'Funcionários' },
  { value: 'user',        label: 'Usuários externos' },
  { value: 'third_party', label: 'Terceiros' },
] as const

const appFormSchema = z.object({
  name:             z.string().min(1, 'Nome é obrigatório').max(255),
  url:              z.string().min(1, 'URL é obrigatória').url('URL inválida. Use o formato https://exemplo.com'),
  description:      z.string().max(500).optional(),
  iconUrl:          z.string().optional(),
  passToken:        z.boolean(),
  allowedProfiles:  z.array(z.string()),
  allowedUsersRaw:  z.string(),
  allowedTeamsRaw:  z.string(),
})

export type AppFormValues = z.infer<typeof appFormSchema>

function parseLines(raw: string): string[] {
  return raw.split('\n').map(s => s.trim()).filter(Boolean)
}

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
  const title  = isEdit ? 'Editar aplicativo' : 'Criar aplicativo'

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
      name:            app?.name ?? '',
      url:             app?.url ?? '',
      description:     app?.description ?? '',
      iconUrl:         app?.icon ?? '',
      passToken:       app?.passToken ?? false,
      allowedProfiles: app?.allowedProfiles ?? [],
      allowedUsersRaw: (app?.allowedUsers ?? []).join('\n'),
      allowedTeamsRaw: (app?.allowedTeams ?? []).join('\n'),
    },
  })

  // Sync form when editing a different app
  useEffect(() => {
    if (open) {
      reset({
        name:            app?.name ?? '',
        url:             app?.url ?? '',
        description:     app?.description ?? '',
        iconUrl:         app?.icon ?? '',
        passToken:       app?.passToken ?? false,
        allowedProfiles: app?.allowedProfiles ?? [],
        allowedUsersRaw: (app?.allowedUsers ?? []).join('\n'),
        allowedTeamsRaw: (app?.allowedTeams ?? []).join('\n'),
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, app?.id])

  const passToken        = watch('passToken')
  const allowedProfiles  = watch('allowedProfiles')
  const allowedUsersRaw  = watch('allowedUsersRaw')
  const allowedTeamsRaw  = watch('allowedTeamsRaw')

  const noAccessRules =
    allowedProfiles.length === 0 &&
    parseLines(allowedUsersRaw).length === 0 &&
    parseLines(allowedTeamsRaw).length === 0

  function onSubmit(values: AppFormValues) {
    onConfirm(values)
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form
          id="app-form"
          onSubmit={e => { void handleSubmit(onSubmit)(e) }}
          className="flex flex-col gap-4 py-1"
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
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
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

          {/* Icon URL */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="app-icon" className="text-sm font-medium">
              Ícone (emoji ou URL)
            </label>
            <Input
              id="app-icon"
              placeholder="📦 ou https://cdn.exemplo.com/icon.png"
              {...register('iconUrl')}
            />
          </div>

          {/* passToken */}
          <div className="flex flex-col gap-2">
            <Controller
              name="passToken"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="app-pass-token"
                    type="checkbox"
                    checked={field.value}
                    onChange={e => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm font-medium">Passar token de sessão (passToken)</span>
                </label>
              )}
            />
            {passToken && (
              <div
                role="note"
                className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800"
              >
                <strong>Atenção:</strong> A integração SSO via token ainda não está implementada no
                front-end React. Este campo só terá efeito quando o fluxo SSO estiver concluído.
              </div>
            )}
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
                        onChange={e => {
                          field.onChange(
                            e.target.checked
                              ? [...field.value, value]
                              : field.value.filter(v => v !== value),
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

          {/* Allowed Users (UIDs) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="app-users" className="text-sm font-medium">
              Usuários específicos
              <span className="ml-1 text-xs text-muted-foreground font-normal">(um UID por linha)</span>
            </label>
            <textarea
              id="app-users"
              rows={3}
              placeholder={'uid-alice\nuid-bob'}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              {...register('allowedUsersRaw')}
            />
          </div>

          {/* Allowed Teams */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="app-teams" className="text-sm font-medium">
              Times com acesso
              <span className="ml-1 text-xs text-muted-foreground font-normal">(um nome por linha)</span>
            </label>
            <textarea
              id="app-teams"
              rows={3}
              placeholder={'Engenharia\nFinanceiro'}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              {...register('allowedTeamsRaw')}
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
            <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </form>

        <DialogFooter>
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
