import crypto from 'node:crypto'
import { google } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
]

let cachedAuth = null

function getAuth() {
  if (cachedAuth) return cachedAuth
  const email = process.env.GOOGLE_CLIENT_EMAIL
  let key = process.env.GOOGLE_PRIVATE_KEY
  if (!email || !key) {
    throw new Error('Service account belum dikonfigurasi (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY)')
  }
  key = key.replace(/\\n/g, '\n')
  cachedAuth = new google.auth.JWT({ email, key, scopes: SCOPES })
  return cachedAuth
}

export const sheetsClient = () => google.sheets({ version: 'v4', auth: getAuth() })
export const driveClient = () => google.drive({ version: 'v3', auth: getAuth() })

export const HEADERS = [
  'No', 'Source', 'Type', 'Requester', 'Period', 'Year',
  'Problem/Issue', 'Action', 'Date', 'Task Started', 'Task Finished',
  'Resolution Time', 'First Response Time', 'Status', 'Engineer', 'Remarks',
]

const FIELD_ALIASES = {
  no: ['no', 'no.', 'nomor', '#'], source: ['source', 'sumber', 'channel'],
  type: ['type', 'tipe', 'jenis', 'category'], requester: ['requester', 'site', 'unit', 'pemohon', 'user'],
  period: ['period', 'periode', 'month', 'bulan'], year: ['year', 'tahun'],
  problem: ['problem/issue', 'problem', 'issue', 'problem / issue', 'kendala', 'deskripsi'],
  action: ['action', 'aksi', 'tindakan', 'action taken'], date: ['date', 'tanggal', 'tgl'],
  taskStarted: ['task started', 'start', 'mulai', 'start time'], taskFinished: ['task finished', 'finish', 'selesai', 'end time'],
  resolutionTime: ['resolution time', 'durasi', 'duration'], firstResponseTime: ['first response time', 'frt', 'response time'],
  status: ['status', 'state'], engineer: ['engineer', 'pic', 'teknisi', 'assignee'], remarks: ['remarks', 'keterangan', 'notes', 'catatan'],
}

function normalizeHeader(value) {
  return String(value ?? '').replace(/[\u00A0\u200B-\u200D\uFEFF]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
}

function buildHeaderMap(headerRow) {
  const raw = {}
  headerRow.forEach((header, index) => {
    const key = normalizeHeader(header)
    if (key && !(key in raw)) raw[key] = index
  })
  const map = {}
  const missing = []
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const alias = aliases.find(item => item in raw)
    if (alias !== undefined) map[field] = raw[alias]
    else missing.push(field)
  }
  return { map, missing }
}

function cell(row, index) {
  if (typeof index !== 'number') return ''
  return row[index] == null ? '' : String(row[index]).trim()
}

function normalizeSheetDateTime(value) {
  const match = String(value || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(\s+.*)?$/)
  if (!match) return value
  const time = (match[4] || '').trim().replace(/^(\d{1,2}):(\d{2})(.*)$/, (_, hour, minute, suffix) => `${hour.padStart(2, '0')}:${minute}${suffix}`)
  return `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}${time ? ` ${time}` : ''}`
}

export function fingerprint(payload) {
  return crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex')
}

export async function resolveSheet(spreadsheetId, sheetName) {
  const response = await sheetsClient().spreadsheets.get({
    spreadsheetId,
    fields: 'sheets(properties(sheetId,title))',
  })
  const sheets = response.data.sheets || []
  const wanted = normalizeHeader(sheetName)
  const found = sheets.find(sheet => normalizeHeader(sheet.properties.title) === wanted) || sheets[0]
  if (!found) throw new Error(`Spreadsheet ${spreadsheetId} tidak punya tab apa pun`)
  return { gid: found.properties.sheetId, title: found.properties.title }
}

export async function verifySheetAccess(spreadsheetId) {
  await sheetsClient().spreadsheets.get({ spreadsheetId, fields: 'spreadsheetId' })
  return true
}

export async function getSheetData(spreadsheetId, sheetName = 'Sheet1') {
  const { gid, title } = await resolveSheet(spreadsheetId, sheetName)
  const response = await sheetsClient().spreadsheets.values.get({
    spreadsheetId,
    range: `'${title.replace(/'/g, "''")}'`,
    valueRenderOption: 'FORMATTED_VALUE',
    majorDimension: 'ROWS',
  })
  const rows = response.data.values || []
  if (!rows.length) return { tickets: [], quarantined: [], headerIssues: ['sheet kosong'], sheetTitle: title, gid }

  let headerIndex = rows.findIndex(row => (row || []).some(cellValue => ['problem/issue', 'problem', 'issue'].includes(normalizeHeader(cellValue))))
  if (headerIndex < 0) headerIndex = 0
  const { map, missing } = buildHeaderMap(rows[headerIndex] || [])
  const tickets = []
  const quarantined = []

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index] || []
    const rowNumber = index + 1
    if (row.every(value => String(value ?? '').trim() === '')) continue
    const problem = cell(row, map.problem)
    if (!problem) {
      quarantined.push({ rowNumber, reason: 'kolom Problem/Issue kosong', raw: row.slice(0, 8) })
      continue
    }
    const requester = cell(row, map.requester)
    tickets.push({
      rowId: `${gid}:${rowNumber}`, rowNumber,
      no: Number.parseInt(cell(row, map.no), 10) || rowNumber - headerIndex - 1,
      source: cell(row, map.source) || 'WhatsApp', type: cell(row, map.type) || 'Problem', requester,
      requesterIsRawNpp: /^\d{5,6}$/.test(requester), period: cell(row, map.period),
      year: Number.parseInt(cell(row, map.year), 10) || new Date().getFullYear(), problem,
      action: cell(row, map.action), date: normalizeSheetDateTime(cell(row, map.date)),
      taskStarted: normalizeSheetDateTime(cell(row, map.taskStarted)),
      taskFinished: normalizeSheetDateTime(cell(row, map.taskFinished)), resolutionTime: cell(row, map.resolutionTime),
      firstResponseTime: cell(row, map.firstResponseTime), status: cell(row, map.status) || 'UNKNOWN',
      engineer: cell(row, map.engineer), remarks: cell(row, map.remarks),
    })
  }
  const headerIssues = []
  if (missing.length) headerIssues.push(`kolom tidak terdeteksi: ${missing.join(', ')}`)
  if (headerIndex > 0) headerIssues.push(`header ditemukan di baris ${headerIndex + 1}, bukan baris 1`)
  return { tickets, quarantined, headerIssues, sheetTitle: title, gid }
}

let writeChain = Promise.resolve()
function withWriteLock(fn) {
  const run = writeChain.then(fn, fn)
  writeChain = run.then(() => undefined, () => undefined)
  return run
}

export function appendTicketsToSheet(tickets, spreadsheetId, sheetName = 'Sheet1') {
  if (!tickets?.length) return Promise.resolve({ success: true, appended: 0 })
  return withWriteLock(async () => {
    const { gid, title } = await resolveSheet(spreadsheetId, sheetName)
    const sheets = sheetsClient()
    const quoted = `'${title.replace(/'/g, "''")}'`
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${quoted}!A:A` }).catch(() => null)
    const existing = response?.data?.values || []
    const needsHeaders = existing.length === 0
    const nextNumber = needsHeaders ? 1 : existing.length
    const rows = tickets.map((ticket, index) => [
      nextNumber + index, ticket.source || 'WhatsApp', ticket.type || '', ticket.requester || '', ticket.period || '',
      ticket.year || new Date().getFullYear(), ticket.problem || '', ticket.action || '', ticket.date || '',
      ticket.taskStarted || '', ticket.taskFinished || '', ticket.resolutionTime || '', ticket.firstResponseTime || '',
      ticket.status || 'OPEN', ticket.engineer || 'ITSM NAC BNI', ticket.remarks || '',
    ])
    const requests = []
    if (needsHeaders) requests.push({ updateCells: { rows: [{ values: HEADERS.map(header => ({ userEnteredValue: { stringValue: header }, userEnteredFormat: { backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 }, textFormat: { bold: true } } })) }], fields: 'userEnteredValue,userEnteredFormat', start: { sheetId: gid, rowIndex: 0, columnIndex: 0 } } })
    requests.push({ appendCells: { sheetId: gid, rows: rows.map(row => ({ values: row.map(value => ({ userEnteredValue: { stringValue: String(value) } })) })), fields: 'userEnteredValue' } })
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } })
    return { success: true, appended: rows.length, firstNumber: nextNumber }
  })
}