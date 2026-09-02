/**
 * Returns true if the given birth_date string ("YYYY-MM-DD") has the same
 * month and day as today's local date (the year is intentionally ignored,
 * as expected for recurring birthday checks).
 *
 * Returns false for null, undefined, or invalid strings.
 */
export function isBirthdayToday(birthDate: string | null | undefined): boolean {
  if (!birthDate) return false
  // birthDate is guaranteed "YYYY-MM-DD" by the API (dateStrings: ['DATE'])
  const parts = birthDate.split('-')
  if (parts.length !== 3) return false
  const month = Number(parts[1])
  const day   = Number(parts[2])
  if (isNaN(month) || isNaN(day)) return false
  const today = new Date()
  return today.getMonth() + 1 === month && today.getDate() === day
}
