// Setores usados na plataforma legada de sugestões (platform_suggestions.sector).
const DEFAULT_SECTORS = [
  'CAOC',
  'COR',
  'Instalação FTTX',
  'Infraestrutura',
  'Operação',
  'Planejamento de Redes',
  'Suporte Técnico',
  'Suporte, COR, Infra, CAOC',
  'SUPORTE, COR, OPERAÇÃO, INFRA',
]

function mergeSectors(fromDb = []) {
  const seen = new Set()
  const merged = []

  for (const value of [...DEFAULT_SECTORS, ...fromDb]) {
    const trimmed = String(value || '').trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(trimmed)
  }

  return merged.sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

module.exports = { DEFAULT_SECTORS, mergeSectors }
