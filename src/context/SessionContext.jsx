import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { safeGetItem, safeSetItem, validateSessions } from '../lib/storageUtils'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [sheetsTickets, setSheetsTickets] = useState(null)
  const [lastSheetsSync, setLastSheetsSync] = useState(null)
  useEffect(() => {
    const loaded = validateSessions(safeGetItem('sessions', []))
    setSessions(loaded)

    // Auto-select: prefer sheets-import if it has tickets, else first session
    const sheetsSession = loaded.find(s => s.id === 'sheets-import')
    if (sheetsSession?.tickets?.length > 0) {
      setActiveSessionId('sheets-import')
    } else if (loaded.length > 0) {
      setActiveSessionId(loaded[0].id)
    }
  }, [])

  const persist = useCallback((updated) => {
    setSessions(updated)
    safeSetItem('sessions', updated)
  }, [])

  const createSession = useCallback(() => {
    const newSession = {
      id: Date.now().toString(),
      title: `Session ${new Date().toLocaleDateString('en-US')}`,
      messages: [],
      tickets: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const updated = [newSession, ...sessions]
    persist(updated)
    setActiveSessionId(newSession.id)
    return newSession
  }, [sessions, persist])

  const deleteSession = useCallback((sessionId) => {
    const updated = sessions.filter(s => s.id !== sessionId)
    persist(updated)
    if (activeSessionId === sessionId) {
      setActiveSessionId(updated[0]?.id || null)
    }
  }, [sessions, activeSessionId, persist])

  const updateSession = useCallback((sessionId, updates) => {
    const updated = sessions.map(s =>
      s.id === sessionId
        ? { ...s, ...updates, updatedAt: new Date().toISOString() }
        : s
    )
    persist(updated)
  }, [sessions, persist])

  // Merge tickets from Sheets into a session
  const mergeTicketsFromSheets = useCallback((sheetsTickets) => {
    if (!sheetsTickets || sheetsTickets.length === 0) return

    // Create or update a "Sheets Import" session
    let sheetsSession = sessions.find(s => s.id === 'sheets-import')

    const allExistingTickets = sessions.flatMap(s => s.tickets || [])

    // Deduplicate
    const newTickets = sheetsTickets.filter(sheetsTicket => {
      return !allExistingTickets.some(existing =>
        existing.problem === sheetsTicket.problem &&
        existing.requester === sheetsTicket.requester &&
        existing.date === sheetsTicket.date
      )
    })

    if (newTickets.length === 0) return

    if (!sheetsSession) {
      sheetsSession = {
        id: 'sheets-import',
        title: `Sheets Import ${new Date().toLocaleDateString('en-US')}`,
        messages: [],
        tickets: newTickets,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isImported: true
      }
      const updated = [...sessions, sheetsSession]
      persist(updated)
      setActiveSessionId(sheetsSession.id)
    } else {
      // Always switch to sheets import session to show the tickets
      setActiveSessionId(sheetsSession.id)
      // Merge with existing sheets session
      const merged = [
        ...sheetsSession.tickets,
        ...newTickets
      ].reduce((unique, ticket) => {
        const isDup = unique.some(t =>
          t.problem === ticket.problem &&
          t.requester === ticket.requester &&
          t.date === ticket.date
        )
        return isDup ? unique : [...unique, ticket]
      }, [])

      updateSession(sheetsSession.id, { tickets: merged })
    }
  }, [sessions, persist, updateSession])


  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId) || null
  }, [sessions, activeSessionId])

  // Derived: all tickets from all sessions (for History/Dashboard) - only approved ones
  // When Google Sheets tickets are loaded, Sheets is the source of truth
  const allTickets = useMemo(() => {
    if (sheetsTickets !== null) {
      return sheetsTickets
    }
    return sessions.flatMap(s => (s.tickets || []).filter(t => t.approved !== false))
  }, [sessions, sheetsTickets])
  const value = useMemo(() => ({
    sessions,
    activeSession,
    activeSessionId,
    allTickets,
    sheetsTickets,
    setSheetsTickets,
    lastSheetsSync,
    setLastSheetsSync,
    setActiveSessionId,
    createSession,
    deleteSession,
    updateSession,
    mergeTicketsFromSheets,
  }), [
    sessions,
    activeSession,
    activeSessionId,
    allTickets,
    sheetsTickets,
    lastSheetsSync,
    createSession,
    deleteSession,
    updateSession,
    mergeTicketsFromSheets,
  ])

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
