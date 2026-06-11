export const SEBRATEL_PROFILES = [
  { value: 'infraestrutura', label: 'Infraestrutura' },
  { value: 'tecnica',        label: 'Técnica'        },
  { value: 'atendimento',    label: 'Atendimento'    },
  { value: 'comercial',      label: 'Comercial'      },
  { value: 'users',          label: 'Geral'          },
] as const

export type SebratelProfile = (typeof SEBRATEL_PROFILES)[number]['value']

export const PROFILE_LABEL: Record<string, string> = Object.fromEntries(
  SEBRATEL_PROFILES.map(({ value, label }) => [value, label])
)

// Earth-tone / warm-palette — alinhado com design system GER (sem azul/roxo)
export const PROFILE_STYLE: Record<string, string> = {
  infraestrutura: 'border-stone-300  bg-stone-100  text-stone-700',
  tecnica:        'border-amber-300  bg-amber-50   text-amber-800',
  atendimento:    'border-green-200  bg-green-50   text-green-700',
  comercial:      'border-orange-200 bg-orange-50  text-orange-700',
  users:          'border-gray-200   bg-gray-50    text-gray-600',
}
