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

export const PROFILE_STYLE: Record<string, string> = {
  infraestrutura: 'border-blue-200   bg-blue-50   text-blue-700   dark:border-blue-700   dark:bg-blue-950   dark:text-blue-300',
  tecnica:        'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  atendimento:    'border-green-200  bg-green-50  text-green-700  dark:border-green-700  dark:bg-green-950  dark:text-green-300',
  comercial:      'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-300',
  users:          'border-gray-200   bg-gray-50   text-gray-600   dark:border-gray-600   dark:bg-gray-900   dark:text-gray-400',
}
