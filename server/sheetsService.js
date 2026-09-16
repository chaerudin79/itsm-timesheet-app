// Google Sheets access via Service Account.
// This runs server-side only, so it never triggers a browser OAuth popup.
// The service account must be shared (Editor) on the target spreadsheet.

import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

let cachedAuth = null

function getAuth() {
  if (cachedAuth) return cachedAuth

  const email = process.env.GOOGLE_CLIENT_EMAIL
  let key = process.env.GOOGLE_PRIVATE_KEY

  if (!email || !key) {
    throw new Error(
      'Service account not configured. Set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in server/.env'
    )
  }

  // .env stores the private key with literal "\n" sequences; convert back to real newlines.
  key = key.replace(/\\n/g, '\n')

  cachedAuth = new google.auth.JWT({
    email,
    key,
    scopes: SCOPES
  })
  return cachedAuth
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

const HEADERS = [
  'No', 'Source', 'Type', 'Requester', 'Period', 'Year',
  'Problem/Issue', 'Action', 'Date', 'Task Started', 'Task Finished',
  'Resolution Time', 'First Response Time', 'Status', 'Engineer', 'Remarks'
]

export async function verifySheetAccess(sheetId) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  return true
}

export async function getSheetData(sheetId, sheetName = 'Sheet1') {
  const sheets = getSheetsClient()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: sheetName,
  })

  const rows = response.data.values || []
  if (rows.length === 0) return []

  const headers = rows[0]
  const headerMap = {}
  headers.forEach((h, idx) => {
    if (typeof h === 'string') headerMap[h.toLowerCase().trim()] = idx
  })
  const normalizeKey = (key) => String(key).toLowerCase().trim()

  const tickets = rows.slice(1).map((row, idx) => {
    if (!row || row.length === 0) return null
    const get = (key, defaultVal = '') => {
      const index = headerMap[normalizeKey(key)]
      return typeof index === 'number' ? row[index] || defaultVal : defaultVal
    }
    return {
      no: parseInt(get('no')) || idx + 1,
      source: get('source', 'WhatsApp'),
      type: get('type', 'Problem'),
      requester: get('requester', ''),
      period: get('period', ''),
      year: parseInt(get('year')) || new Date().getFullYear(),
      problem: get('problem/issue', ''),
      action: get('action', ''),
      date: get('date', new Date().toLocaleDateString('en-US')),
      taskStarted: get('task started', ''),
      taskFinished: get('task finished', ''),
      resolutionTime: get('resolution time', ''),
      firstResponseTime: get('first response time', ''),
      status: get('status', 'OPEN'),
      engineer: get('engineer', 'ITSM NAC BNI'),
      remarks: get('remarks', ''),
    }
  }).filter(t => t !== null && t.problem && !/^\d{5,6}$/.test(t.requester))

  return tickets
}

export async function appendTicketsToSheet(tickets, sheetId, sheetName = 'Sheet1') {
  if (!tickets || tickets.length === 0) return { success: true, appended: 0 }

  const sheets = getSheetsClient()
  const finalSheetName = sheetName || 'Sheet1'

  // Figure out the next ticket number and whether headers already exist.
  const getResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${finalSheetName}!A:A`,
  }).catch(() => null)

  let nextNumber = 1
  let needsHeaders = true
  const existingValues = getResponse?.data?.values
  if (existingValues && existingValues.length > 0) {
    needsHeaders = false
    nextNumber = existingValues.length
  }

  const rows = tickets.map((ticket, idx) => [
    nextNumber + idx,
    ticket.source || 'WhatsApp',
    ticket.type || '',
    ticket.requester || '',
    ticket.period || '',
    ticket.year || new Date().getFullYear(),
    ticket.problem || '',
    ticket.action || '',
    ticket.date || new Date().toLocaleDateString('en-US'),
    ticket.taskStarted || '',
    ticket.taskFinished || '',
    ticket.resolutionTime || '',
    ticket.firstResponseTime || '',
    ticket.status || 'OPEN',
    ticket.engineer || 'ITSM NAC BNI',
    ticket.remarks || '',
  ])

  const requests = []

  if (needsHeaders) {
    requests.push({
      updateCells: {
        rows: [{
          values: HEADERS.map(h => ({
            userEnteredValue: { stringValue: h },
            userEnteredFormat: {
              backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
              textFormat: { bold: true },
            },
          })),
        }],
        fields: 'userEnteredValue,userEnteredFormat',
        start: { sheetId: 0, rowIndex: 0, columnIndex: 0 },
      },
    })
  }

  requests.push({
    appendCells: {
      sheetId: 0,
      rows: rows.map(row => ({
        values: row.map(cell => ({
          userEnteredValue: { stringValue: String(cell) },
        })),
      })),
      fields: 'userEnteredValue',
    },
  })

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: { requests },
  })

  return { success: true, appended: rows.length }
}
