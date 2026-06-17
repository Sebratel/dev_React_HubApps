import { useState } from 'react'
import { Search, SlidersHorizontal, CheckCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { getTypeMeta } from '../utils'
import type { AnnouncementType } from '@/types/enums'
import type {
  StatusFilter, CategoryFilter, SortOrder,
} from '../hooks/useAnnouncementFilters'

interface AnnouncementsToolbarProps {
  q: string
  status: StatusFilter
  category: CategoryFilter
  sort: SortOrder
  availableCategories: AnnouncementType[]
  unreadCount: number
  activeFilterCount: number
  setQ: (v: string) => void
  setStatus: (v: StatusFilter) => void
  setCategory: (v: CategoryFilter) => void
  setSort: (v: SortOrder) => void
  onMarkAllRead: () => void
}

function StatusSelect({ value, onChange }: { value: StatusFilter; onChange: (v: StatusFilter) => void }) {
  return (
    <Select aria-label="Filtrar por status" value={value} onChange={(e) => onChange(e.target.value as StatusFilter)}>
      <option value="all">Todos os status</option>
      <option value="unread">Não lidos</option>
      <option value="read">Lidos</option>
    </Select>
  )
}

function CategorySelect({
  value, onChange, available,
}: {
  value: CategoryFilter
  onChange: (v: CategoryFilter) => void
  available: AnnouncementType[]
}) {
  return (
    <Select aria-label="Filtrar por categoria" value={value} onChange={(e) => onChange(e.target.value as CategoryFilter)}>
      <option value="all">Todas as categorias</option>
      {available.map((t) => (
        <option key={t} value={t}>{getTypeMeta(t).label}</option>
      ))}
    </Select>
  )
}

function SortSelect({ value, onChange }: { value: SortOrder; onChange: (v: SortOrder) => void }) {
  return (
    <Select aria-label="Ordenar avisos" value={value} onChange={(e) => onChange(e.target.value as SortOrder)}>
      <option value="recent">Mais recentes</option>
      <option value="old">Mais antigos</option>
    </Select>
  )
}

export function AnnouncementsToolbar({
  q, status, category, sort, availableCategories, unreadCount, activeFilterCount,
  setQ, setStatus, setCategory, setSort, onMarkAllRead,
}: AnnouncementsToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/65" aria-hidden />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título ou conteúdo..."
          aria-label="Buscar avisos"
          className="pl-9"
        />
      </div>

      {/* Desktop filters inline */}
      <div className="hidden items-center gap-2 lg:flex">
        <StatusSelect value={status} onChange={setStatus} />
        {availableCategories.length > 1 && (
          <CategorySelect value={category} onChange={setCategory} available={availableCategories} />
        )}
        <SortSelect value={sort} onChange={setSort} />
        {unreadCount > 0 && (
          <Button variant="outline" onClick={onMarkAllRead} className="shrink-0 gap-1.5 whitespace-nowrap">
            <CheckCheck className="h-4 w-4" aria-hidden />
            Marcar todos como lidos
          </Button>
        )}
      </div>

      {/* Mobile: filters trigger + mark all */}
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
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="icon"
            onClick={onMarkAllRead}
            aria-label="Marcar todos como lidos"
            title="Marcar todos como lidos"
            className="shrink-0"
          >
            <CheckCheck className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>

      {/* Mobile filters sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent aria-describedby={undefined} className="sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                Status
                <StatusSelect value={status} onChange={setStatus} />
              </label>
              {availableCategories.length > 1 && (
                <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                  Categoria
                  <CategorySelect value={category} onChange={setCategory} available={availableCategories} />
                </label>
              )}
              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                Ordenação
                <SortSelect value={sort} onChange={setSort} />
              </label>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button className={cn('w-full sm:w-auto')} onClick={() => setFiltersOpen(false)}>
              Ver resultados
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
