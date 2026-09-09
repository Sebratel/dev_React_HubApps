export type Season = 'verão' | 'outono' | 'inverno' | 'primavera'

/**
 * Retorna a estação do ano atual para o hemisfério sul (Brasil).
 *
 * Datas aproximadas:
 *   Verão    — 21/12 a 20/03
 *   Outono   — 20/03 a 21/06
 *   Inverno  — 21/06 a 22/09
 *   Primavera — 22/09 a 21/12
 */
export function getSeason(): Season {
  const now   = new Date()
  const month = now.getMonth() + 1 // 1–12
  const day   = now.getDate()
  const md    = month * 100 + day  // ex.: 9/2 → 902

  if (md >= 1221 || md < 320)  return 'verão'
  if (md >= 320  && md < 621)  return 'outono'
  if (md >= 621  && md < 922)  return 'inverno'
  return 'primavera'
}

export const SEASON_LABEL: Record<Season, string> = {
  'verão':     'Verão',
  'outono':    'Outono',
  'inverno':   'Inverno',
  'primavera': 'Primavera',
}

export const SEASON_EMOJI: Record<Season, string> = {
  'verão':     '☀️',
  'outono':    '🍂',
  'inverno':   '❄️',
  'primavera': '🌸',
}
