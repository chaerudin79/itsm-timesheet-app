export const TICKET_TYPES = ['Problem', 'Request Task', 'Troubleshoot', 'Change Request']

export const TICKET_TYPE_COLORS = {
  Problem: '#EF4444',
  'Request Task': '#E2E8F0',
  Troubleshoot: '#8B5CF6',
  'Change Request': '#F59E0B',
}

export const TICKET_TYPE_BADGES = {
  Problem: 'badge-danger',
  'Request Task': 'badge-muted',
  Troubleshoot: 'badge-purple',
  'Change Request': 'badge-warning',
}

export function getTicketTypeColor(type) {
  return TICKET_TYPE_COLORS[type] || '#64748B'
}

export function getTicketTypeBadge(type) {
  return TICKET_TYPE_BADGES[type] || 'badge-muted'
}
