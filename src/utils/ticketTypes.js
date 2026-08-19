export const TICKET_TYPES = ['Problem', 'Service Request', 'Incident', 'Change Request']

export const TICKET_TYPE_COLORS = {
  Problem: '#EF4444',
  'Service Request': '#E2E8F0',
  Incident: '#8B5CF6',
  'Change Request': '#F59E0B',
}

export const TICKET_TYPE_BADGES = {
  Problem: 'badge-danger',
  'Service Request': 'badge-muted',
  Incident: 'badge-purple',
  'Change Request': 'badge-warning',
}

export function getTicketTypeColor(type) {
  return TICKET_TYPE_COLORS[type] || '#64748B'
}

export function getTicketTypeBadge(type) {
  return TICKET_TYPE_BADGES[type] || 'badge-muted'
}
