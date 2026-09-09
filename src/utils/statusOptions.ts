/** Status predefinidos do momento — armazenados como string "emoji label" no banco */
export const STATUS_OPTIONS = [
  { value: '✅ Disponível',  emoji: '✅', label: 'Disponível'  },
  { value: '🎯 Focado',      emoji: '🎯', label: 'Focado'      },
  { value: '📞 Em reunião',  emoji: '📞', label: 'Em reunião'  },
  { value: '🏠 Home office', emoji: '🏠', label: 'Home office' },
  { value: '☕ Em pausa',    emoji: '☕', label: 'Em pausa'    },
  { value: '🌴 De férias',   emoji: '🌴', label: 'De férias'   },
] as const

export type StatusValue = typeof STATUS_OPTIONS[number]['value']
