/**
 * Batch ticket operations: export, delete, import
 */
import * as XLSX from 'xlsx'

export function exportToCSV(tickets, filename = 'timesheet.csv') {
  if (!tickets || tickets.length === 0) {
    alert('No tickets to export')
    return
  }

  const headers = [
    'No', 'Source', 'Type', 'Requester', 'Period', 'Year', 
    'Problem/Issue', 'Action', 'Date', 'Task Started', 'Task Finished', 
    'Resolution Time', 'First Response Time', 'Status', 'Engineer', 'Remarks'
  ]

  // Escape CSV values
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '""'
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // Create CSV rows
  const rows = tickets.map(ticket => [
    ticket.no || '',
    ticket.source || 'WhatsApp',
    ticket.type || '',
    ticket.requester || '',
    ticket.period || '',
    ticket.year || '',
    ticket.problem || '',
    ticket.action || '',
    ticket.date || '',
    ticket.taskStarted || '',
    ticket.taskFinished || '',
    ticket.resolutionTime || '',
    ticket.firstResponseTime || '',
    ticket.status || '',
    ticket.engineer || '',
    ticket.remarks || ''
  ].map(escapeCSV).join(','))

  const csv = [headers.join(','), ...rows].join('\n')

  // Download
  downloadFile(csv, filename, 'text/csv')
}

export function exportToJSON(tickets, filename = 'timesheet.json') {
  if (!tickets || tickets.length === 0) {
    alert('No tickets to export')
    return
  }

  const json = JSON.stringify(tickets, null, 2)
  downloadFile(json, filename, 'application/json')
}

export function exportToExcel(tickets, filename = 'timesheet.xlsx') {
  if (!tickets || tickets.length === 0) {
    alert('No tickets to export')
    return
  }

  const headers = [
    'No', 'Source', 'Type', 'Requester', 'Period', 'Year',
    'Problem/Issue', 'Action', 'Date', 'Task Started', 'Task Finished',
    'Resolution Time', 'First Response Time', 'Status', 'Engineer', 'Remarks'
  ]

  const rows = tickets.map(ticket => [
    ticket.no || '',
    ticket.source || 'WhatsApp',
    ticket.type || '',
    ticket.requester || '',
    ticket.period || '',
    ticket.year || '',
    ticket.problem || '',
    ticket.action || '',
    ticket.date || '',
    ticket.taskStarted || '',
    ticket.taskFinished || '',
    ticket.resolutionTime || '',
    ticket.firstResponseTime || '',
    ticket.status || '',
    ticket.engineer || '',
    ticket.remarks || ''
  ])

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tickets')
  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  downloadFile(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function deleteTickets(tickets, ticketNos) {
  return tickets.filter(t => !ticketNos.includes(t.no))
}

export function duplicateTickets(tickets, selectedTickets) {
  const duplicates = selectedTickets.map(ticket => ({
    ...ticket,
    no: Math.max(...tickets.map(t => t.no || 0), ...selectedTickets.map(t => t.no || 0)) + 1
  }))
  return [...tickets, ...duplicates]
}

export function getTicketStats(tickets) {
  return {
    total: tickets.length,
    byType: {
      problem: tickets.filter(t => t.type === 'Problem').length,
      request: tickets.filter(t => t.type === 'Service Request').length,
      change: tickets.filter(t => t.type === 'Change Request').length
    },
    byStatus: {
      open: tickets.filter(t => t.status === 'OPEN').length,
      closed: tickets.filter(t => t.status === 'CLOSED').length
    }
  }
}
