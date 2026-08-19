// Pure ticket data utilities — analytics, filtering, aggregation
import { parseResolutionTime } from './dateUtils'

/**
 * Group tickets by a given field key
 * Returns { [value]: count }
 */
export function groupByField(tickets, field) {
  return tickets.reduce((acc, t) => {
    const key = t[field] || 'BNI'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

/**
 * Group tickets by date (M/D/YYYY) — returns array sorted ascending
 * Returns [{ date, count }]
 */
export function groupByDate(tickets) {
  const grouped = tickets.reduce((acc, t) => {
    const key = t.date || 'Unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  return Object.entries(grouped)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

/**
 * Group tickets by month (e.g. "Juni 2026") — returns array sorted ascending
 * Returns [{ month, count }]
 */
export function groupByMonth(tickets) {
  const grouped = tickets.reduce((acc, t) => {
    const key = `${t.period || '?'} ${t.year || '?'}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  return Object.entries(grouped).map(([month, count]) => ({ month, count }))
}

/**
 * Calculate average resolution time in seconds from an array of tickets
 */
export function avgResolutionSeconds(tickets) {
  const valid = tickets.filter(t => t.resolutionTime)
  if (!valid.length) return 0
  const total = valid.reduce((sum, t) => sum + parseResolutionTime(t.resolutionTime), 0)
  return Math.round(total / valid.length)
}

/**
 * Summary stats for a ticket array
 */
export function getSummaryStats(tickets) {
  const total = tickets.length
  const closed = tickets.filter(t => t.status === 'CLOSED').length
  const open = total - closed
  const byType = groupByField(tickets, 'type')
  const bySite = groupByField(tickets, 'requester')
  const byEngineer = groupByField(tickets, 'engineer')
  const avgResolution = avgResolutionSeconds(tickets)

  return { total, closed, open, byType, bySite, byEngineer, avgResolution }
}

/**
 * Filter tickets based on a filter object
 * { search, site, status, engineer, type, dateFrom, dateTo }
 */
export function filterTickets(tickets, filters = {}) {
  return tickets.filter(t => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const hit = [t.problem, t.requester, t.engineer, t.action, t.remarks]
        .some(f => f?.toLowerCase().includes(q))
      if (!hit) return false
    }
    if (filters.site && t.requester !== filters.site) return false
    if (filters.status && t.status !== filters.status) return false
    if (filters.engineer && t.engineer !== filters.engineer) return false
    if (filters.type && t.type !== filters.type) return false
    if (filters.dateFrom) {
      const d = new Date(t.date)
      if (isNaN(d) || d < new Date(filters.dateFrom)) return false
    }
    if (filters.dateTo) {
      const d = new Date(t.date)
      if (isNaN(d) || d > new Date(filters.dateTo)) return false
    }
    return true
  })
}

/**
 * Get unique values for a field across all tickets
 */
export function uniqueValues(tickets, field) {
  return [...new Set(tickets.map(t => t[field]).filter(Boolean))].sort()
}
