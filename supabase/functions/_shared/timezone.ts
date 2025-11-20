// ============================================================================
// TIMEZONE UTILITIES
// Helper functions for timezone conversion and formatting
// ============================================================================

/**
 * Convert timezone offset in hours to ISO 8601 format
 * @param offsetHours - Timezone offset in hours (e.g., -3, 0, +5.5)
 * @returns ISO 8601 timezone string (e.g., "-03:00", "+00:00", "+05:30")
 *
 * @example
 * offsetToISO(-3) // "-03:00" (BRT)
 * offsetToISO(0) // "+00:00" (UTC)
 * offsetToISO(5.5) // "+05:30" (IST)
 * offsetToISO(-8) // "-08:00" (PST)
 */
export function offsetToISO(offsetHours: number): string {
  if (!Number.isFinite(offsetHours)) {
    throw new Error(`Invalid timezone offset: ${offsetHours}`)
  }

  // Check valid range (-12 to +14)
  if (offsetHours < -12 || offsetHours > 14) {
    throw new Error(`Timezone offset out of range: ${offsetHours}. Must be between -12 and +14`)
  }

  const sign = offsetHours >= 0 ? '+' : '-'
  const absOffset = Math.abs(offsetHours)

  const hours = Math.floor(absOffset)
  const minutes = Math.round((absOffset - hours) * 60)

  const hoursStr = String(hours).padStart(2, '0')
  const minutesStr = String(minutes).padStart(2, '0')

  return `${sign}${hoursStr}:${minutesStr}`
}

/**
 * Convert ISO 8601 timezone string to offset in hours
 * @param isoTimezone - ISO 8601 timezone string (e.g., "-03:00", "+05:30")
 * @returns Timezone offset in hours (e.g., -3, 5.5)
 *
 * @example
 * isoToOffset("-03:00") // -3
 * isoToOffset("+00:00") // 0
 * isoToOffset("+05:30") // 5.5
 */
export function isoToOffset(isoTimezone: string): number {
  const match = isoTimezone.match(/^([+-])(\d{2}):(\d{2})$/)

  if (!match) {
    throw new Error(`Invalid ISO timezone format: ${isoTimezone}. Expected format: ±HH:MM`)
  }

  const [, sign, hoursStr, minutesStr] = match
  const hours = parseInt(hoursStr, 10)
  const minutes = parseInt(minutesStr, 10)

  if (hours > 14 || (hours === 14 && minutes > 0)) {
    throw new Error(`Timezone offset out of range: ${isoTimezone}`)
  }

  const offset = hours + (minutes / 60)
  return sign === '-' ? -offset : offset
}

/**
 * Get current date/time in store's timezone
 * @param offsetHours - Timezone offset in hours
 * @returns Current date in store's local timezone
 */
export function getNowInTimezone(offsetHours: number): Date {
  const now = new Date()
  const utcTime = now.getTime()
  const localTime = utcTime + (offsetHours * 60 * 60 * 1000)
  return new Date(localTime)
}

/**
 * Format date for API queries (YYYY-MM-DD)
 * @param date - Date object
 * @returns Formatted date string
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get date range for last N days in store's timezone
 * @param days - Number of days to look back
 * @param offsetHours - Timezone offset in hours
 * @returns Object with start_date and end_date formatted for APIs
 *
 * @example
 * getDateRangeInTimezone(30, -3)
 * // { start_date: "2025-01-20", end_date: "2025-02-19" }
 */
export function getDateRangeInTimezone(
  days: number,
  offsetHours: number = 0
): { start_date: string; end_date: string } {
  const now = getNowInTimezone(offsetHours)

  // End date is today
  const end_date = formatDateForAPI(now)

  // Start date is N days ago
  const startTime = now.getTime() - (days * 24 * 60 * 60 * 1000)
  const start_date = formatDateForAPI(new Date(startTime))

  return { start_date, end_date }
}

/**
 * Common timezones with their offsets
 */
export const COMMON_TIMEZONES = {
  'UTC': 0,
  'America/Sao_Paulo': -3,        // BRT
  'America/New_York': -5,         // EST
  'America/Chicago': -6,          // CST
  'America/Denver': -7,           // MST
  'America/Los_Angeles': -8,      // PST
  'Europe/London': 0,             // GMT
  'Europe/Paris': 1,              // CET
  'Europe/Berlin': 1,             // CET
  'Asia/Tokyo': 9,                // JST
  'Australia/Sydney': 10,         // AEST
} as const

/**
 * Get timezone offset by name
 * @param timezoneName - Timezone name (e.g., "America/Sao_Paulo")
 * @returns Offset in hours, or null if not found
 */
export function getOffsetByName(timezoneName: string): number | null {
  return COMMON_TIMEZONES[timezoneName as keyof typeof COMMON_TIMEZONES] ?? null
}

/**
 * Validate timezone offset is within valid range
 * @param offsetHours - Timezone offset to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimezoneOffset(offsetHours: number): boolean {
  return Number.isFinite(offsetHours) && offsetHours >= -12 && offsetHours <= 14
}
