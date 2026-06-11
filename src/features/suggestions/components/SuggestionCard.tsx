import { MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SuggestionModel } from '@/services/suggestion.service'
import type { SuggestionType, SuggestionStatus } from '@/types/enums'

const TYPE_CONFIG: Record<SuggestionType, { label: string; classes: string }> = {
  feature:     { label: 'Funcionalidade', classes: 'border-amber-200  bg-amber-50   text-amber-800'  },
  improvement: { label: 'Melhoria',       classes: 'border-stone-300  bg-stone-100  text-stone-700'  },
  bug:         { label: 'Bug',            classes: 'border-red-200    bg-red-50     text-red-700'    },
  other:       { label: 'Outro',          classes: 'border-gray-200   bg-gray-50    text-gray-600'   },
}

const STATUS_CONFIG: Record<SuggestionStatus, { label: string; classes: string }> = {
  pending:   { label: 'Aguardando',   classes: 'border-amber-200 bg-amber-50  text-amber-800'  },
  in_review: { label: 'Em análise',   classes: 'border-stone-300 bg-stone-100 text-stone-700'  },
  done:      { label: 'Concluída',    classes: 'border-green-200 bg-green-50  text-green-700'  },
  rejected:  { label: 'Encerrada',    classes: 'border-border    bg-muted     text-muted-foreground' },
}

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface SuggestionCardProps {
  suggestion: SuggestionModel
}

export function SuggestionCard({ suggestion: s }: SuggestionCardProps) {
  const type   = TYPE_CONFIG[s.type]   ?? TYPE_CONFIG.other
  const status = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pending

  return (
    <div className={cn(
      'rounded-xl border bg-card p-4 flex flex-col gap-3',
      s.status === 'rejected' && 'opacity-70'
    )}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={type.classes}>{type.label}</Badge>
          {s.appName && (
            <span className="text-xs text-muted-foreground font-medium">{s.appName}</span>
          )}
        </div>
        <Badge variant="outline" className={status.classes}>{status.label}</Badge>
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground leading-snug">{s.title}</p>
        {s.body && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed line-clamp-3">{s.body}</p>
        )}
      </div>

      {s.adminNote && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 flex gap-2">
          <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
          <span><span className="font-semibold">Resposta: </span>{s.adminNote}</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</p>
    </div>
  )
}
