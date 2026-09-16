// Sheets access now goes through our own backend (Service Account),
// instead of calling Google Sheets API directly from the browser.
// This is what removes the Google login popup entirely.

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787'
const API_KEY = import.meta.env.VITE_BACKEND_API_KEY || ''

async function backendFetch(path, options = {}) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...(options.headers || {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    let message = response.statusText
    try {
      const body = await response.json()
      message = body.error || message
    } catch {
      // ignore parse errors, keep statusText
    }
    throw new Error(`Backend error (${response.status}): ${message}`)
  }

  return response.json()
}

export async function appendTicketsToSheet(tickets, sheetId, sheetName = 'Sheet1') {
  if (!tickets || tickets.length === 0) return { success: true, appended: 0 }
  try {
    return await backendFetch('/api/sheets/append', {
      method: 'POST',
      body: JSON.stringify({ sheetId, sheetName, tickets }),
    })
  } catch (error) {
    console.error('Failed to append to Google Sheet:', error)
    throw error
  }
}

export async function getSheetData(sheetId, sheetName = 'Sheet1') {
  if (!sheetId) return []
  try {
    const params = new URLSearchParams({ sheetId, sheetName })
    const data = await backendFetch(`/api/sheets/data?${params.toString()}`)
    return data.tickets || []
  } catch (error) {
    console.error('Failed to get sheet data:', error)
    throw error // <-- MUST throw so useSheetsSync knows it failed!
  }
}

export async function verifySheetAccess(sheetId) {
  if (!sheetId) return false
  try {
    const params = new URLSearchParams({ sheetId })
    const data = await backendFetch(`/api/sheets/verify?${params.toString()}`)
    return Boolean(data.ok)
  } catch {
    return false
  }
}
