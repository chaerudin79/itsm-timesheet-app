import { useState, useCallback } from 'react'
import { appendTicketsToSheet, getSheetData } from '../lib/googleSheetsApi'
import { useAuth } from '../context/AuthContext'

function ticketKey(ticket) {
  return [
    ticket.problem || '',
    ticket.requester || '',
    ticket.date || '',
    ticket.action || '',
    ticket.type || '',
  ].map(value => String(value).trim().toLowerCase()).join('|')
}

function findMissingLocalTickets(localTickets = [], sheetsTickets = []) {
  const sheetCounts = new Map()
  sheetsTickets.forEach(ticket => {
    const key = ticketKey(ticket)
    sheetCounts.set(key, (sheetCounts.get(key) || 0) + 1)
  })

  return localTickets.filter(ticket => {
    const key = ticketKey(ticket)
    const remaining = sheetCounts.get(key) || 0
    if (remaining > 0) {
      sheetCounts.set(key, remaining - 1)
      return false
    }
    return true
  })
}

/**
 * Hook to synchronize data from Google Sheets
 * Provides: loading, error, importedTickets, loadSheetsData, importTickets
 */
export function useSheetsSync() {
  const { getActiveAuth, sheetId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [importedTickets, setImportedTickets] = useState([])

  const loadSheetsData = useCallback(async () => {
    if (!sheetId) return []
    setLoading(true)
    setError(null)
    try {
      const auth = await getActiveAuth()
      const tickets = await getSheetData(auth.accessToken, sheetId)
      return tickets
    } catch (err) {
      console.error('Failed to load Sheets data:', err)
      setError('Failed to read Google Sheets')
      return []
    } finally {
      setLoading(false)
    }
  }, [sheetId, getActiveAuth])

  const importTickets = useCallback(async (existingTickets = []) => {
    const sheetsTickets = await loadSheetsData()

    // Deduplicate: check if tickets from Sheets already exist locally
    const deduplicated = sheetsTickets.filter(sheetsTicket => {
      return !existingTickets.some(existing =>
        existing.problem === sheetsTicket.problem &&
        existing.requester === sheetsTicket.requester &&
        existing.date === sheetsTicket.date
      )
    })

    setImportedTickets(deduplicated)
    return deduplicated
  }, [loadSheetsData])

  const auditLocalVsSheets = useCallback(async (localTickets = [], preloadedSheetsTickets = null) => {
    const sheetsTickets = preloadedSheetsTickets || await loadSheetsData()
    const missingTickets = findMissingLocalTickets(localTickets, sheetsTickets)

    return {
      localCount: localTickets.length,
      sheetsCount: sheetsTickets.length,
      missingTickets,
      missingCount: missingTickets.length,
    }
  }, [loadSheetsData])

  const syncMissingTickets = useCallback(async (localTickets = []) => {
    const audit = await auditLocalVsSheets(localTickets)
    if (audit.missingTickets.length === 0) return { ...audit, appended: 0 }

    const auth = await getActiveAuth()
    const result = await appendTicketsToSheet(audit.missingTickets, auth.accessToken, sheetId)
    return { ...audit, appended: result.appended || audit.missingTickets.length }
  }, [auditLocalVsSheets, getActiveAuth, sheetId])

  return {
    loading,
    error,
    importedTickets,
    loadSheetsData,
    importTickets,
    auditLocalVsSheets,
    syncMissingTickets,
    clearError: () => setError(null)
  }
}
