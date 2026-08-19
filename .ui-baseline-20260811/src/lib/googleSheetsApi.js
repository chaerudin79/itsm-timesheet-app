// Google Sheets API integration
// Uses googleapis library for read/write operations

const SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets'

export async function appendTicketsToSheet(tickets, accessToken, sheetId, sheetName = 'Sheet1') {
  if (!tickets || tickets.length === 0) return { success: true, appended: 0 }
  if (accessToken === 'mock-access-token') {
    return { success: true, appended: tickets.length }
  }

  try {
    // Get sheet name (default to "Sheet1")
    const finalSheetName = sheetName || 'Sheet1'

    // Build headers if needed
    const headers = [
      'No', 'Source', 'Type', 'Requester', 'Period', 'Year',
      'Problem/Issue', 'Action', 'Date', 'Task Started', 'Task Finished',
      'Resolution Time', 'Status', 'Engineer', 'Remarks'
    ]

    // Get existing rows in column A to determine the next ticket number
    const getResponse = await fetch(
      `${SHEETS_API_URL}/${sheetId}/values/${finalSheetName}!A:A`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )

    let nextNumber = 1
    let needsHeaders = true

    if (getResponse.ok) {
      const data = await getResponse.json()
      if (data.values && data.values.length > 0) {
        needsHeaders = false
        nextNumber = data.values.length
      }
    }

    // Prepare rows
    const rows = tickets.map((ticket, idx) => [
      nextNumber + idx, // No
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
      ticket.status || 'OPEN',
      ticket.engineer || 'ITSM NAC BNI',
      ticket.remarks || ''
    ])

    // Build update requests
    const requests = []

    if (needsHeaders) {
      requests.push({
        updateCells: {
          rows: [{
            values: headers.map(h => ({
              userEnteredValue: { stringValue: h },
              userEnteredFormat: {
                backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
                textFormat: { bold: true }
              }
            }))
          }],
          fields: 'userEnteredValue,userEnteredFormat',
          start: { sheetId: 0, rowIndex: 0, columnIndex: 0 }
        }
      })
    }

    // Append data rows
    requests.push({
      appendCells: {
        sheetId: 0,
        rows: rows.map(row => ({
          values: row.map(cell => ({
            userEnteredValue: {
              stringValue: String(cell)
            }
          }))
        })),
        fields: 'userEnteredValue'
      }
    })

    // Execute batch update
    const response = await fetch(
      `${SHEETS_API_URL}/${sheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Sheets API error: ${error.error?.message || response.statusText}`)
    }

    return { success: true, appended: rows.length }
  } catch (error) {
    console.error('Failed to append to Google Sheet:', error)
    throw error
  }
}

export async function getSheetData(accessToken, sheetId, sheetName = 'Sheet1') {
  if (accessToken === 'mock-access-token') {
    return []
  }
  try {
    const response = await fetch(
      `${SHEETS_API_URL}/${sheetId}/values/${sheetName}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to read Google Sheet')
    }

    const data = await response.json()
    const rows = data.values || []

    if (rows.length === 0) return []

    // Parse header row
    const headers = rows[0]
    const headerMap = {}
    headers.forEach((h, idx) => {
      headerMap[h.toLowerCase()] = idx
    })

    // Parse data rows into ticket objects
    const tickets = rows.slice(1).map((row, idx) => {
      if (!row || row.length === 0) return null

      const get = (key, defaultVal = '') => row[headerMap[key.toLowerCase()]] || defaultVal

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
        status: get('status', 'OPEN'),
        engineer: get('engineer', 'ITSM NAC BNI'),
        remarks: get('remarks', '')
      }
    }).filter(t => t !== null && t.problem) // Filter null dan empty rows

    return tickets
  } catch (error) {
    console.error('Failed to get sheet data:', error)
    return []
  }
}

export async function verifySheetAccess(accessToken, sheetId) {
  if (accessToken === 'mock-access-token') {
    return true
  }
  try {
    const response = await fetch(
      `${SHEETS_API_URL}/${sheetId}/properties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )
    return response.ok
  } catch {
    return false
  }
}
