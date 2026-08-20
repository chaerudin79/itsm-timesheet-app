// Extract dan parse JSON tiket dari response Gemini

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// Convert Indonesian WhatsApp date format (D/M/YYYY) to sheet format (M/D/YYYY).
function fixDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr

  // Match date format: M/D/YYYY or MM/DD/YYYY
  const dateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!dateMatch) return dateStr

  const [, first, second, year] = dateMatch
  const firstNum = parseInt(first, 10)
  const secondNum = parseInt(second, 10)

  // If first number > 12, it must be DD/MM/YYYY (day > 12 means it can't be month)
  if (firstNum > 12) {
    // DD/MM/YYYY format - swap to MM/DD/YYYY
    return `${second}/${first}/${year}`
  }

  // If second number > 12, it's already MM/DD/YYYY (month > 12 is impossible)
  if (secondNum > 12) {
    // Already in correct format or invalid, keep as is
    return dateStr
  }

  // Both numbers <= 12 - ambiguous, but assume DD/MM/YYYY (Indonesian format)
  // and convert to MM/DD/YYYY
  return `${second}/${first}/${year}`
}

// Fix time format to include date
function fixDateTime(dateTimeStr) {
  if (!dateTimeStr || typeof dateTimeStr !== 'string') return dateTimeStr

  // Match format: M/D/YYYY H:MM or MM/DD/YYYY H:MM
  const match = dateTimeStr.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+)$/)
  if (!match) return dateTimeStr

  const [, datePart, timePart] = match
  const fixedDate = fixDate(datePart)

  return `${fixedDate} ${timePart}`
}

function getPeriodFromSheetDate(dateStr) {
  const match = dateStr?.match(/^(\d{1,2})\/\d{1,2}\/\d{4}$/)
  if (!match) return ''
  const month = parseInt(match[1], 10)
  return MONTHS[month - 1] || ''
}

function getYearFromSheetDate(dateStr) {
  const match = dateStr?.match(/^\d{1,2}\/\d{1,2}\/(\d{4})$/)
  return match ? parseInt(match[1], 10) : null
}

function extractWhatsAppDates(chatText = '') {
  const matches = [...chatText.matchAll(/\[\d{1,2}[.:]\d{2},\s*(\d{1,2}\/\d{1,2}\/\d{4})\]/g)]
  return matches.map(match => ({
    whatsappDate: match[1],
    sheetDate: fixDate(match[1]),
  }))
}

// Calculate the first response from the ITSM engineer after the first client message.
function extractFirstResponseTime(chatText = '') {
  const messageRegex = /^\[(\d{1,2})[.:](\d{2}),\s*(\d{1,2}\/\d{1,2}\/\d{4})\]\s*([^:]+):/gm
  const messages = [...chatText.matchAll(messageRegex)].map(match => ({
    hour: Number(match[1]), minute: Number(match[2]), sender: match[4].trim(),
  }))
  const firstClient = messages.find(message => message.sender !== 'ITSM NAC BNI')
  if (!firstClient) return ''
  const firstResponse = messages.find(message => message.sender === 'ITSM NAC BNI')
  if (!firstResponse) return ''
  const seconds = (firstResponse.hour * 60 + firstResponse.minute - (firstClient.hour * 60 + firstClient.minute)) * 60
  if (seconds < 0) return ''
  return `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function normalizeTicketDates(ticket, sourceDates) {
  const normalized = { ...ticket }
  const primarySourceDate = sourceDates[0]
  const sourceDateByWhatsapp = new Map(sourceDates.map(item => [item.whatsappDate, item.sheetDate]))
  const sourceDateBySheet = new Set(sourceDates.map(item => item.sheetDate))

  const normalizeDatePart = (value) => {
    if (!value || typeof value !== 'string') return value
    if (sourceDateByWhatsapp.has(value)) return sourceDateByWhatsapp.get(value)
    if (sourceDateBySheet.has(value)) return value

    const fixed = fixDate(value)
    if (sourceDateBySheet.has(fixed)) return fixed
    return fixed
  }

  const normalizeDateTimePart = (value) => {
    if (!value || typeof value !== 'string') return value
    const match = value.match(/^(\d{1,2}\/\d{1,2}\/\d{4})(\s+.+)$/)
    if (!match) return value

    const [, datePart, timePart] = match
    return `${normalizeDatePart(datePart)}${timePart}`
  }

  normalized.date = normalizeDatePart(normalized.date)
  normalized.taskStarted = normalizeDateTimePart(normalized.taskStarted)
  normalized.taskFinished = normalizeDateTimePart(normalized.taskFinished)

  if (primarySourceDate && (!normalized.date || normalized.date === new Date().toLocaleDateString('en-US'))) {
    normalized.date = primarySourceDate.sheetDate
  }

  const period = getPeriodFromSheetDate(normalized.date)
  const year = getYearFromSheetDate(normalized.date)
  if (period) normalized.period = period
  if (year) normalized.year = year

  return normalized
}

export function parseTickets(responseText, sourceChatText = '') {

  if (!responseText) {
    return { text: '', tickets: [] }
  }

  // Regex untuk cari semua ```json ... ``` block (flag g untuk multiple blocks)
  const jsonBlockRegex = /```json\n?([\s\S]*?)\n?```/g
  const match = responseText.match(jsonBlockRegex)

  let tickets = []
  // Strip semua ```json ... ``` blocks dari cleanText sekaligus
  let cleanText = responseText.replace(jsonBlockRegex, '').trim()

  // Ambil konten dari block pertama untuk di-parse
  const singleBlockRegex = /```json\n?([\s\S]*?)\n?```/
  const firstMatch = responseText.match(singleBlockRegex)

  if (firstMatch && firstMatch[1]) {
    try {
      const jsonStr = firstMatch[1].trim()
      let parsed
      try {
        parsed = JSON.parse(jsonStr)
      } catch (parseErr) {
        console.warn('Full JSON parse failed, trying partial recovery:', parseErr.message)
        // Try to recover complete objects from truncated array
        const objectMatches = jsonStr.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g)
        if (objectMatches) {
          parsed = objectMatches.reduce((acc, objStr) => {
            try { acc.push(JSON.parse(objStr)) } catch { /* skip malformed */ }
            return acc
          }, [])
        }
      }

      // Normalize to array
      // Support:
      // - JSON array: [{...}]
      // - single object: {...}
      // - wrapper objects: { tickets: [...] } / { data: [...] }
      if (!Array.isArray(parsed)) {
        if (parsed && typeof parsed === 'object') {
          const maybeArray = parsed.tickets || parsed.data
          if (Array.isArray(maybeArray)) parsed = maybeArray
          else if (Object.keys(parsed).length > 0) parsed = [parsed]
        }
      }

      // Validate that result is an array
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sourceDates = extractWhatsAppDates(sourceChatText)
        const firstResponseTime = extractFirstResponseTime(sourceChatText)
        tickets = parsed.map((ticket, idx) => {
          const fixedTicket = {
            no: ticket.no || idx + 1,
            source: ticket.source || 'WhatsApp',
            type: ticket.type || 'Problem',
            requester: ticket.requester || 'User - BNI',
            period: ticket.period || '',
            year: ticket.year || new Date().getFullYear(),
            problem: ticket.problem || ticket['Problem/Issue'] || '',
            action: ticket.action || '',
            date: ticket.date || new Date().toLocaleDateString('en-US'),
            taskStarted: ticket.taskStarted || ticket['Task Started'] || '',
            taskFinished: ticket.taskFinished || ticket['Task Finished'] || '',
            resolutionTime: ticket.resolutionTime || ticket['Resolution Time'] || '',
            firstResponseTime: ticket.firstResponseTime || ticket['First Response Time'] || firstResponseTime,
            status: ticket.status || 'OPEN',
            engineer: ticket.engineer || 'ITSM NAC BNI',
            remarks: ticket.remarks || ''
          }
          return normalizeTicketDates(fixedTicket, sourceDates)
        })
      }

      // cleanText sudah di-strip dari semua ```json blocks di atas
    } catch (error) {
      console.error('Failed to parse JSON block:', error)
      // cleanText tetap pakai versi yang sudah di-strip, jangan reset ke responseText
    }
  }

  return {
    text: cleanText,
    tickets: tickets
  }
}

export function validateTicket(ticket) {
  // Minimal validation
  const required = ['type', 'requester', 'problem', 'action']
  return required.every(field => ticket[field])
}

export function calculateResolutionTime(taskStarted, taskFinished) {
  try {
    const start = new Date(taskStarted)
    const end = new Date(taskFinished)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return ''
    }

    const diffMs = end - start
    const hours = Math.floor(diffMs / 3600000)
    const minutes = Math.floor((diffMs % 3600000) / 60000)
    const seconds = Math.floor((diffMs % 60000) / 1000)

    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  } catch {
    return ''
  }
}

export function detectDuplicates(newTickets, existingTickets) {
  const duplicates = []
  const unique = []

  newTickets.forEach(newTicket => {
    const isDuplicate = existingTickets.some(existing =>
      existing.problem === newTicket.problem &&
      existing.requester === newTicket.requester &&
      existing.date === newTicket.date
    )

    if (isDuplicate) {
      duplicates.push(newTicket)
    } else {
      unique.push(newTicket)
    }
  })

  return { unique, duplicates }
}
