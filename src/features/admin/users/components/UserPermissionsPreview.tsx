import { Badge } from '@/components/ui/badge'

const PERMISSION_LABELS: Record<string, string> = {
  internal: 'Interno',
  admin_third: 'Admin Terceiros',
  third_party: 'Terceiro',
  access_carnes_delivery: 'Carnês Delivery',
  visualizacao: 'Visualização',
  access_internal_tools: 'Ferramentas Internas',
  massiva_view: 'Massiva View',
  massiva_open: 'Massiva Open',
  motoboy: 'Motoboy',
  financeiro: 'Financeiro',
}

interface UserPermissionsPreviewProps {
  permissions: string[]
  maxVisible?: number
}

export function UserPermissionsPreview({
  permissions,
  maxVisible = 3,
}: UserPermissionsPreviewProps) {
  if (permissions.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const visible = permissions.slice(0, maxVisible)
  const overflow = permissions.length - maxVisible

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((p) => (
        <Badge key={p} variant="outline" className="text-xs px-1.5 py-0">
          {PERMISSION_LABELS[p] ?? p}
        </Badge>
      ))}
      {overflow > 0 && (
        <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">
          +{overflow}
        </Badge>
      )}
    </div>
  )
}
