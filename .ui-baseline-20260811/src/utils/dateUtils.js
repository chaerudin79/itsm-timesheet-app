// Pure date/time formatting utilities

/**
 * Parse various date string formats to a Date object.
 * Supports M/D/YYYY and M/D/YYYY H:MM
 */
export function parseTicketDate(str) {
  if (!str) return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Format a Date to M/D/YYYY
 */
export function formatDate(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

/**
 * Return Indonesian month name for a date
 */
export function getIndonesianMonth(date) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  const d = date instanceof Date ? date : new Date(date)
  return months[d.getMonth()] || ''
}

/**
 * Parse H:MM:SS string to total seconds
 */
export function parseResolutionTime(str) {
  if (!str) return 0
  const parts = str.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60
  return 0
}

/**
 * Format seconds to H:MM:SS
 */
export function formatResolutionTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Format a Date to relative time (e.g. "2 minutes ago")
 */
export function relativeTime(date) {
  if (!date) return ''
  const now = new Date()
  const d = date instanceof Date ? date : new Date(date)
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return formatDate(d)
}
