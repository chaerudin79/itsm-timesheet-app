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

function sanitizeTicketText(value) {
  if (!value || typeof value !== 'string') return value

  let nextValue = value
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP REDACTED]')
    .replace(/\b(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}\b/g, '[MAC REDACTED]')
    .replace(/\b(?:[0-9A-Fa-f]{2}[-:]){5}[0-9A-Fa-f]{2}\b/g, '[MAC REDACTED]')

  if (nextValue === '[IP REDACTED]' || nextValue === '[MAC REDACTED]') {
    return 'Device request'
  }

  return nextValue
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

// Calculate the first response and resolution time per ticket based on chat chronology.
// This is safer than a single global value when one chat contains multiple days or several tickets.
function formatDurationFromSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return ''
  if (seconds === 0) return '0:01:00'
  return `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function getMinutesFromMessage(message) {
  return (message.hour * 60) + message.minute
}

function normalizeSender(sender = '') {
  return sender.trim().toLowerCase().replace(/\s+/g, ' ')
}

function isITSMAgent(sender = '') {
  const normalized = normalizeSender(sender)
  if (/desktop|sdd/.test(normalized)) return false
  return /itsm\s*nac|nac\s*bni/.test(normalized) || (/itsm/.test(normalized) && !/desktop|helpdesk/.test(normalized))
}

function extractChatMessageEntries(chatText = '') {
  if (!chatText || typeof chatText !== 'string') return []

  const patterns = [
    /^\[(\d{1,2})[.:](\d{2}),\s*(\d{1,2}\/\d{1,2}\/\d{4})\]\s*([^:]+):\s*(.*)$/gm,
    /^(\d{1,2})[.:](\d{2})\s*[-,]\s*(\d{1,2}\/\d{1,2}\/\d{4})?\s*([^:]+):\s*(.*)$/gm,
    /^(\d{1,2})[.:](\d{2})\s*[, ]\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*[^:]+:\s*(.*)$/gm,
  ]

  const collected = []
  for (const pattern of patterns) {
    const matches = [...chatText.matchAll(pattern)]
    for (const match of matches) {
      const hour = Number(match[1])
      const minute = Number(match[2])
      const date = match[3] || match[4] || ''
      const sender = match[4] || match[5] || match[3] || ''
      const body = (match[5] || match[6] || match[4] || '').trim()

      if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue
      if (!date || !sender) continue

      const normalizedSender = sender.trim()
      if (!normalizedSender || normalizedSender === 'undefined') continue

      collected.push({
        hour,
        minute,
        date: date.trim(),
        sender: normalizedSender,
        body: body.replace(/^\s*[:\-]\s*/, '').trim(),
      })
    }
  }

  if (collected.length > 0) {
    return collected
  }

  return [...chatText.matchAll(/^\s*(?:\[)?(\d{1,2})[.:](\d{2})(?:\s*[,\-])?\s*(?:\d{1,2}\/\d{1,2}\/\d{4})?\s*([^:]+):\s*(.*)$/gm)].map(match => ({
    hour: Number(match[1]),
    minute: Number(match[2]),
    date: (match[3] || '').trim(),
    sender: (match[4] || '').trim(),
    body: (match[5] || '').trim(),
  })).filter(entry => Number.isFinite(entry.hour) && Number.isFinite(entry.minute) && entry.sender)
}

function extractTicketTimingSequence(chatText = '') {
  const messages = extractChatMessageEntries(chatText).map(match => ({
    hour: Number(match.hour), minute: Number(match.minute), date: match.date.trim(), sender: match.sender.trim(),
  }))

  if (!messages.length) return []

  const ticketTimings = []
  let currentIssue = null

  for (const message of messages) {
    const isClient = !isITSMAgent(message.sender)

    if (isClient) {
      if (!currentIssue) {
        currentIssue = {
          startedAt: message,
          firstResponseAt: null,
          lastSupportAt: null,
        }
        continue
      }

      const hasReply = currentIssue.firstResponseAt !== null && currentIssue.lastSupportAt
      const lastSupportMinutes = hasReply ? getMinutesFromMessage(currentIssue.lastSupportAt) : null
      const incomingMinutes = getMinutesFromMessage(message)
      const gapMinutes = lastSupportMinutes === null ? 0 : incomingMinutes - lastSupportMinutes
      const requesterChanged = normalizeSender(currentIssue.startedAt.sender) !== normalizeSender(message.sender)
      const shouldStartNewIssue = hasReply && (gapMinutes >= 1 || requesterChanged || currentIssue.startedAt.date !== message.date)

      if (shouldStartNewIssue) {
        ticketTimings.push(currentIssue)
        currentIssue = {
          startedAt: message,
          firstResponseAt: null,
          lastSupportAt: null,
        }
      }
      continue
    }

    if (!currentIssue) continue

    if (!currentIssue.firstResponseAt) {
      currentIssue.firstResponseAt = message
    }
    currentIssue.lastSupportAt = message
  }

  if (currentIssue) {
    ticketTimings.push(currentIssue)
  }

  return ticketTimings.map(issue => {
    const startMinutes = getMinutesFromMessage(issue.startedAt)
    const firstResponseMinutes = issue.firstResponseAt ? getMinutesFromMessage(issue.firstResponseAt) : null
    const finalMinutes = issue.lastSupportAt ? getMinutesFromMessage(issue.lastSupportAt) : null

    return {
      firstResponseTime: firstResponseMinutes === null ? '' : formatDurationFromSeconds((firstResponseMinutes - startMinutes) * 60),
      resolutionTime: finalMinutes === null ? '' : formatDurationFromSeconds((finalMinutes - startMinutes) * 60),
    }
  })
}

function extractFirstResponseTimes(chatText = '') {
  return extractTicketTimingSequence(chatText).map(item => item.firstResponseTime)
}

function extractFirstResponseTime(chatText = '') {
  const values = extractFirstResponseTimes(chatText)
  return values[0] || ''
}

function extractExpectedTicketCount(responseText = '') {
  if (!responseText || typeof responseText !== 'string') return 0

  const match = responseText.match(/(?:total|jumlah|service\s*request)\s*:?\s*(\d+)\s*(?:tickets?|tiket)s?/i) ||
    responseText.match(/(\d+)\s*(?:tickets?|tiket)\s*(?:service\s*request)?/i) ||
    responseText.match(/(?:service\s*request)\s*:?\s*(\d+)/i)

  if (!match) return 0
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : 0
}

function buildChatDerivedTickets(chatText = '', expectedCount = 0) {
  if (!chatText || !expectedCount) return []

  const messageMatches = extractChatMessageEntries(chatText)

  if (!messageMatches.length) return []

  const issues = []
  let current = null

  for (const match of messageMatches) {
    const hour = Number(match.hour)
    const minute = Number(match.minute)
    const date = (match.date || '').trim()
    const sender = (match.sender || '').trim()
    const body = (match.body || '').trim()
    const isClient = !isITSMAgent(sender)

    if (isClient) {
      if (!current) {
        current = {
          startedAt: { date, hour, minute, sender, body },
          firstResponseAt: null,
          lastSupportAt: null,
        }
        continue
      }

      const lastSupport = current.lastSupportAt
      const incomingMinutes = (hour * 60) + minute
      const lastSupportMinutes = lastSupport ? (lastSupport.hour * 60) + lastSupport.minute : null
      const gapMinutes = lastSupportMinutes === null ? 0 : incomingMinutes - lastSupportMinutes
      const requesterChanged = normalizeSender(current.startedAt.sender) !== normalizeSender(sender)
      const differentDate = current.startedAt.date !== date

      if (current.firstResponseAt && current.lastSupportAt && (gapMinutes >= 1 || requesterChanged || differentDate)) {
        issues.push(current)
        current = {
          startedAt: { date, hour, minute, sender, body },
          firstResponseAt: null,
          lastSupportAt: null,
        }
      }
      continue
    }

    if (!current) continue

    if (!current.firstResponseAt) {
      current.firstResponseAt = { date, hour, minute, sender, body }
    }
    current.lastSupportAt = { date, hour, minute, sender, body }
  }

  if (current) issues.push(current)

  return issues.slice(0, expectedCount).map((issue, index) => {
    const startedAt = issue.startedAt
    const firstResponseAt = issue.firstResponseAt || startedAt
    const lastSupportAt = issue.lastSupportAt || startedAt

    const startedMinutes = (startedAt.hour * 60) + startedAt.minute
    const firstResponseMinutes = (firstResponseAt.hour * 60) + firstResponseAt.minute
    const finishedMinutes = (lastSupportAt.hour * 60) + lastSupportAt.minute

    const dateValue = fixDate(startedAt.date)
    const yearValue = getYearFromSheetDate(dateValue) || new Date().getFullYear()
    const periodValue = getPeriodFromSheetDate(dateValue)

    return {
      no: index + 1,
      source: 'WhatsApp',
      type: 'Service Request',
      requester: sanitizeTicketText(startedAt.sender || 'User - BNI'),
      period: periodValue,
      year: yearValue,
      problem: sanitizeTicketText(startedAt.body || 'Service Request'),
      action: sanitizeTicketText(lastSupportAt.body || 'Processed'),
      date: dateValue,
      taskStarted: `${dateValue} ${String(startedAt.hour).padStart(2, '0')}:${String(startedAt.minute).padStart(2, '0')}`,
      taskFinished: `${fixDate(lastSupportAt.date)} ${String(lastSupportAt.hour).padStart(2, '0')}:${String(lastSupportAt.minute).padStart(2, '0')}`,
      resolutionTime: formatDurationFromSeconds((finishedMinutes - startedMinutes) * 60),
      firstResponseTime: formatDurationFromSeconds((firstResponseMinutes - startedMinutes) * 60),
      status: 'CLOSED',
      engineer: 'ITSM NAC BNI',
      remarks: sanitizeTicketText(''),
    }
  })
}

function parseDurationToSeconds(value) {
  if (!value || typeof value !== 'string') return null

  const parts = value.split(':').map(part => Number(part))
  if (parts.length !== 3 || parts.some(part => Number.isNaN(part))) {
    return null
  }

  return (parts[0] * 3600) + (parts[1] * 60) + parts[2]
}

function normalizeResponseTime(firstResponseValue, resolutionValue, useDefaultIfEmpty = false) {
  if (firstResponseValue === null || firstResponseValue === undefined || firstResponseValue === '') {
    return useDefaultIfEmpty ? '0:01:00' : ''
  }

  const normalizedFirstResponse = normalizeMinimumDuration(firstResponseValue, useDefaultIfEmpty)
  const normalizedResolution = normalizeMinimumDuration(resolutionValue, true)

  if (!normalizedFirstResponse) return normalizedResolution || ''

  const firstResponseSeconds = parseDurationToSeconds(normalizedFirstResponse)
  const resolutionSeconds = parseDurationToSeconds(normalizedResolution)

  if (firstResponseSeconds === null) return normalizedFirstResponse
  if (resolutionSeconds !== null && firstResponseSeconds > resolutionSeconds) {
    return normalizedResolution || normalizedFirstResponse
  }

  return normalizedFirstResponse
}

function normalizeMinimumDuration(value, useDefaultIfEmpty = false) {
  if (value === null || value === undefined || value === '') {
    return useDefaultIfEmpty ? '0:01:00' : ''
  }

  if (typeof value !== 'string') return value

  const parts = value.split(':').map(part => Number(part))
  if (parts.length !== 3 || parts.some(part => Number.isNaN(part))) {
    return value
  }

  const totalSeconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2]
  if (totalSeconds < 60) return '0:01:00'
  return value
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

  // Jangan menimpa tanggal tiket yang sudah valid dari AI. Kita hanya pakai
  // tanggal source chat sebagai fallback saat field date benar-benar kosong
  // atau masih berupa placeholder default.
  const defaultTodayDate = new Date().toLocaleDateString('en-US')
  if (primarySourceDate && (!normalized.date || normalized.date === defaultTodayDate)) {
    normalized.date = primarySourceDate.sheetDate
  }

  const period = getPeriodFromSheetDate(normalized.date)
  const year = getYearFromSheetDate(normalized.date)
  if (period) normalized.period = period
  if (year) normalized.year = year

  return normalized
}

function extractJsonPayload(responseText = '') {
  if (!responseText) return ''

  const fencedMatches = [...responseText.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/g)]
  if (fencedMatches.length > 0) {
    const first = fencedMatches[0][1]?.trim()
    if (first) return first
  }

  const text = responseText.trim()
  const startIndex = text.search(/[\[{]/)
  if (startIndex === -1) return ''

  const candidate = text.slice(startIndex).trim()
  if (candidate.startsWith('[') || candidate.startsWith('{')) return candidate

  return ''
}

function repairPartialObjectString(rawObject = '') {
  if (!rawObject || typeof rawObject !== 'string') return ''

  const trimmed = rawObject.trim()
  if (!trimmed) return ''

  const startIndex = trimmed.indexOf('{')
  const inner = startIndex === -1 ? trimmed : trimmed.slice(startIndex + 1)
  const result = {}
  let i = 0
  let sawField = false

  while (i < inner.length) {
    while (i < inner.length && /\s/.test(inner[i])) i += 1
    if (i >= inner.length || inner[i] === '}') break
    if (inner[i] === ',') {
      i += 1
      continue
    }
    if (inner[i] !== '"') break

    let key = ''
    let j = i + 1
    let escaped = false
    while (j < inner.length) {
      const ch = inner[j]
      if (escaped) {
        key += ch
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === '"') {
        j += 1
        break
      } else {
        key += ch
      }
      j += 1
    }

    if (j >= inner.length || inner[j - 1] !== '"') break

    while (j < inner.length && /\s/.test(inner[j])) j += 1
    if (j >= inner.length || inner[j] !== ':') break
    j += 1
    while (j < inner.length && /\s/.test(inner[j])) j += 1

    let value = ''
    if (j < inner.length && inner[j] === '"') {
      j += 1
      let valueEnd = j
      let escaped = false
      while (valueEnd < inner.length) {
        const ch = inner[valueEnd]
        if (escaped) {
          value += ch
          escaped = false
        } else if (ch === '\\') {
          escaped = true
        } else if (ch === '"') {
          valueEnd += 1
          break
        } else {
          value += ch
        }
        valueEnd += 1
      }

      if (valueEnd >= inner.length && inner[inner.length - 1] !== '"') {
        value = inner.slice(j - 1, inner.length).slice(1)
        i = inner.length
      } else {
        i = valueEnd
      }
    } else {
      const valueStart = j
      while (j < inner.length && inner[j] !== ',' && inner[j] !== '}') j += 1
      value = inner.slice(valueStart, j).trim()
      i = j
    }

    sawField = true
    result[key] = value

    while (i < inner.length && /\s/.test(inner[i])) i += 1
    if (i < inner.length && inner[i] === ',') {
      i += 1
    } else if (i < inner.length && inner[i] === '}') {
      break
    }
  }

  if (!sawField || Object.keys(result).length === 0) return ''

  return `{${Object.entries(result).map(([key, value]) => `"${key}": ${JSON.stringify(value)}`).join(', ')}}`
}

function salvageTruncatedJson(rawJson = '') {
  if (!rawJson || typeof rawJson !== 'string') return rawJson

  const text = rawJson.trim()
  if (!text) return text

  const startMatches = [...text.matchAll(/\{\s*"no"\s*:/g)].map(match => match.index)
  const recovered = []

  if (startMatches.length > 0) {
    for (let i = 0; i < startMatches.length; i++) {
      const start = startMatches[i]
      const end = i < startMatches.length - 1 ? startMatches[i + 1] : text.length
      const chunk = text.slice(start, end)
      const repaired = repairPartialObjectString(chunk)
      if (repaired) recovered.push(repaired)
    }

    if (recovered.length > 0) {
      return `[${recovered.join(',')}]`
    }
  }

  const fallback = text.startsWith('[') ? text : text.includes('{') ? text.slice(text.indexOf('{')) : text
  const repaired = repairPartialObjectString(fallback)
  return repaired || text
}

export function parseTickets(responseText, sourceChatText = '') {

  if (!responseText) {
    return { text: '', tickets: [] }
  }

  const jsonBlockRegex = /```(?:json)?\s*[\s\S]*?```/g
  let cleanText = responseText.replace(jsonBlockRegex, '').trim()

  const jsonStr = extractJsonPayload(responseText)
  let tickets = []

  if (jsonStr) {
    const parseCandidates = [jsonStr, salvageTruncatedJson(jsonStr)]

    for (const candidate of parseCandidates) {
      if (!candidate || typeof candidate !== 'string') continue

      try {
        let parsed = JSON.parse(candidate)

        if (!Array.isArray(parsed)) {
          if (parsed && typeof parsed === 'object') {
            const maybeArray = parsed.tickets || parsed.data
            if (Array.isArray(maybeArray)) parsed = maybeArray
            else if (Object.keys(parsed).length > 0) parsed = [parsed]
          }
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
          const sourceDates = extractWhatsAppDates(sourceChatText)
          const ticketTimings = extractTicketTimingSequence(sourceChatText)
          tickets = parsed.map((ticket, idx) => {
            const computedResolution = calculateResolutionTime(ticket.taskStarted || ticket['Task Started'], ticket.taskFinished || ticket['Task Finished']) || ''
            const fallbackResolution = ticketTimings[idx]?.resolutionTime || ''
            const fallbackFirstResponse = ticketTimings[idx]?.firstResponseTime || ''
            const resolutionValue = ticket.resolutionTime || ticket['Resolution Time'] || computedResolution || fallbackResolution
            const firstResponseValue = ticket.firstResponseTime || ticket['First Response Time'] || fallbackFirstResponse

            const fixedTicket = {
              no: ticket.no || idx + 1,
              source: ticket.source || 'WhatsApp',
              type: ticket.type || 'Problem',
              requester: sanitizeTicketText(ticket.requester || 'User - BNI'),
              period: ticket.period || '',
              year: ticket.year || new Date().getFullYear(),
              problem: sanitizeTicketText(ticket.problem || ticket['Problem/Issue'] || ''),
              action: sanitizeTicketText(ticket.action || ''),
              date: ticket.date || new Date().toLocaleDateString('en-US'),
              taskStarted: ticket.taskStarted || ticket['Task Started'] || '',
              taskFinished: ticket.taskFinished || ticket['Task Finished'] || '',
              resolutionTime: normalizeMinimumDuration(resolutionValue),
              firstResponseTime: normalizeResponseTime(firstResponseValue, resolutionValue, true),
              status: ticket.status || 'CLOSED',
              engineer: 'ITSM NAC BNI',
              remarks: sanitizeTicketText(ticket.remarks || '')
            }
            return normalizeTicketDates(fixedTicket, sourceDates)
          })
          break
        }
      } catch (error) {
        continue
      }
    }

    if (tickets.length === 0) {
      const fallbackJson = salvageTruncatedJson(jsonStr)
      const recovered = []

      try {
        const parsed = JSON.parse(fallbackJson)
        if (Array.isArray(parsed)) recovered.push(...parsed)
        else if (parsed && typeof parsed === 'object') recovered.push(parsed)
      } catch {
        const objectMatches = (fallbackJson.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [])
        for (const objStr of objectMatches) {
          try {
            const parsed = JSON.parse(objStr)
            if (parsed && typeof parsed === 'object') recovered.push(parsed)
          } catch {
            // ignore malformed fragments
          }
        }

        if (recovered.length === 0) {
          const perObjectCandidates = fallbackJson
            .split(/\n\s*\{\s*"no"\s*:/)
            .filter(part => /"no"\s*:/.test(part))
            .map(part => ({ part: `{"no":${part.startsWith('"no"') ? '' : ''}${part}` }))

          for (const candidate of perObjectCandidates) {
            try {
              const parsed = JSON.parse(candidate.part)
              if (parsed && typeof parsed === 'object') recovered.push(parsed)
            } catch {
              // ignore malformed fragments
            }
          }
        }
      }

      if (recovered.length > 0) {
        const sourceDates = extractWhatsAppDates(sourceChatText)
        const ticketTimings = extractTicketTimingSequence(sourceChatText)
        tickets = recovered.map((ticket, idx) => {
          const computedResolution = calculateResolutionTime(ticket.taskStarted || ticket['Task Started'], ticket.taskFinished || ticket['Task Finished']) || ''
          const fallbackResolution = ticketTimings[idx]?.resolutionTime || ''
          const fallbackFirstResponse = ticketTimings[idx]?.firstResponseTime || ''
          const resolutionValue = ticket.resolutionTime || ticket['Resolution Time'] || computedResolution || fallbackResolution
          const firstResponseValue = ticket.firstResponseTime || ticket['First Response Time'] || fallbackFirstResponse

          const fixedTicket = {
            no: ticket.no || idx + 1,
            source: ticket.source || 'WhatsApp',
            type: ticket.type || 'Problem',
            requester: sanitizeTicketText(ticket.requester || 'User - BNI'),
            period: ticket.period || '',
            year: ticket.year || new Date().getFullYear(),
            problem: sanitizeTicketText(ticket.problem || ticket['Problem/Issue'] || ''),
            action: sanitizeTicketText(ticket.action || ''),
            date: ticket.date || new Date().toLocaleDateString('en-US'),
            taskStarted: ticket.taskStarted || ticket['Task Started'] || '',
            taskFinished: ticket.taskFinished || ticket['Task Finished'] || '',
            resolutionTime: normalizeMinimumDuration(resolutionValue),
            firstResponseTime: normalizeResponseTime(firstResponseValue, resolutionValue, true),
            status: ticket.status || 'CLOSED',
            engineer: 'ITSM NAC BNI',
            remarks: sanitizeTicketText(ticket.remarks || '')
          }
          return normalizeTicketDates(fixedTicket, sourceDates)
        })
      }
    }
  }

  // ponytail: fallback — only use chat-derived tickets when AI returned NO JSON tickets.
  // Never truncate valid AI-parsed tickets by expectedTicketCount (regex is unreliable).
  if (tickets.length === 0) {
    const expectedTicketCount = extractExpectedTicketCount(responseText)
    if (expectedTicketCount > 0) {
      const chatDerivedTickets = buildChatDerivedTickets(sourceChatText, expectedTicketCount)
      if (chatDerivedTickets.length > 0) {
        return { text: cleanText, tickets: chatDerivedTickets.slice(0, expectedTicketCount) }
      }
    }
  }

  return { text: cleanText, tickets }
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
