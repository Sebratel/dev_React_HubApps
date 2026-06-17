import { useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle,
} from '@/components/ui/sheet'
import { getSuggestionTypeMeta, getSuggestionStatusMeta } from '../utils'
import type { SuggestionType, SuggestionStatus } from '@/types/enums'
import type { TypeFilter, StatusFilter, SortOrder } from '../hooks/useSuggestionFilters'

interface SuggestionsToolbarProps {
  q: string
  type: TypeFilter
  status: StatusFilter
  sort: SortOrder
  availableTypes: SuggestionType[]
  availableStatuses: SuggestionStatus[]
  activeFilterCount: number
  setQ: (v: string) => void
  setType: (v: TypeFilter) => void
  setStatus: (v: StatusFilter) => void
  setSort: (v: SortOrder) => void
}

function TypeSelect({ value, onChange, available }: { value: TypeFilter; onChange: (v: TypeFilter) => void; available: SuggestionType[] }) {
  return (
    <Select aria-label="Filtrar por tipo" value={value} onChange={(e) => onChange(e.target.value as TypeFilter)}>
      <option value="all">Todos os tipos</option>
      {available.map((t) => (
        <option key={t} value={t}>{getSuggestionTypeMeta(t).label}</option>
      ))}
    </Select>
  )
}

function StatusSelect({ value, onChange, available }: { value: StatusFilter; onChange: (v: StatusFilter) => void; available: SuggestionStatus[] }) {
  return (
    <Select aria-label="Filtrar por status" value={value} onChange={(e) => onChange(e.target.value as StatusFilter)}>
      <option value="all">Todos os status</option>
      {available.map((s) => (
        <option key={s} value={s}>{getSuggestionStatusMeta(s).label}</option>
      ))}
    </Select>
  )
}

function SortSelect({ value, onChange }: { value: SortOrder; onChange: (v: SortOrder) => void }) {
  return (
    <Select aria-label="Ordenar sugestões" value={value} onChange={(e) => onChange(e.target.value as SortOrder)}>
      <option value="recent">Mais recentes</option>
      <option value="old">Mais antigas</option>
    </Select>
  )
}

export function SuggestionsToolbar({
  q, type, status, sort, availableTypes, availableStatuses, activeFilterCount,
  setQ, setType, setStatus, setSort,
}: SuggestionsToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/65" aria-hidden />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título, conteúdo ou app..."
          aria-label="Buscar sugestões"
          className="pl-9"
        />
      </div>

      {/* Desktop filters inline */}
      <div className="hidden items-center gap-2 lg:flex">
        {availableTypes.length > 1 && <TypeSelect value={type} onChange={setType} available={availableTypes} />}
        {availableStatuses.length > 1 && <StatusSelect value={status} onChange={setStatus} available={availableStatuses} />}
        <SortSelect value={sort} onChange={setSort} />
      </div>

      {/* Mobile filters trigger */}
      <div className="flex items-center gap-2 lg:hidden">
        <Button variant="outline" onClick={() => setFiltersOpen(true)} className="flex-1 justify-center gap-1.5">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[11px] font-bold tabular-nums text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent aria-describedby={undefined} className="sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <div className="flex flex-col gap-4">
              {availableTypes.length > 1 && (
                <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                  Tipo
                  <TypeSelect value={type} onChange={setType} available={availableTypes} />
                </label>
              )}
              {availableStatuses.length > 1 && (
                <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                  Status
                  <StatusSelect value={status} onChange={setStatus} available={availableStatuses} />
                </label>
              )}
              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                Ordenação
                <SortSelect value={sort} onChange={setSort} />
              </label>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button className="w-full sm:w-auto" onClick={() => setFiltersOpen(false)}>Ver resultados</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
