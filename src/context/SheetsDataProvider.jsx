import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787'
const API_KEY = import.meta.env.VITE_BACKEND_API_KEY || ''
const SheetsDataContext = createContext(null)

export function SheetsDataProvider({ children }) {
  const { sheetId } = useAuth()
  const sheetName = import.meta.env.VITE_GOOGLE_SHEET_NAME || 'Sheet1'
  const [state, setState] = useState({ tickets: [], quarantined: [], headerIssues: [], lastSync: null, status: 'idle', error: null })
  const eventSourceRef = useRef(null)
  const etagRef = useRef(null)

  useEffect(() => {
    if (!sheetId) return undefined
    let closed = false
    let retryTimer
    const apply = payload => {
      etagRef.current = payload.etag || etagRef.current
      setState({ tickets: Array.isArray(payload.tickets) ? payload.tickets : [], quarantined: payload.quarantined || [], headerIssues: payload.headerIssues || [], lastSync: payload.fetchedAt ? new Date(payload.fetchedAt) : new Date(), status: 'live', error: null })
    }
    const connect = () => {
      if (closed) return
      const params = new URLSearchParams({ sheetId, sheetName, key: API_KEY })
      const source = new EventSource(`${BACKEND_URL}/api/sheets/stream?${params}`)
      eventSourceRef.current = source
      source.addEventListener('snapshot', event => { try { apply(JSON.parse(event.data)) } catch { /* fallback poll handles malformed payload */ } })
      source.addEventListener('error', event => {
        if (event?.data) { try { const payload = JSON.parse(event.data); setState(current => ({ ...current, status: 'degraded', error: payload.error })) } catch { /* reconnect below */ } }
        source.close(); eventSourceRef.current = null
        if (!closed) { setState(current => ({ ...current, status: 'degraded' })); retryTimer = setTimeout(connect, 3000) }
      })
    }
    setState(current => ({ ...current, status: 'connecting' })); connect()
    return () => { closed = true; clearTimeout(retryTimer); eventSourceRef.current?.close(); eventSourceRef.current = null }
  }, [sheetId, sheetName])

  useEffect(() => {
    if (!sheetId) return undefined
    const poll = async () => {
      if (document.visibilityState !== 'visible' || eventSourceRef.current) return
      const params = new URLSearchParams({ sheetId, sheetName })
      try {
        const response = await fetch(`${BACKEND_URL}/api/sheets/data?${params}`, { cache: 'no-store', headers: { 'x-api-key': API_KEY, ...(etagRef.current ? { 'If-None-Match': `"${etagRef.current}"` } : {}) } })
        if (response.status === 304) return
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const payload = await response.json(); etagRef.current = payload.etag; setState({ tickets: payload.tickets || [], quarantined: payload.quarantined || [], headerIssues: payload.headerIssues || [], lastSync: new Date(payload.fetchedAt || Date.now()), status: 'degraded', error: null })
      } catch (error) { setState(current => ({ ...current, status: 'error', error: error.message })) }
    }
    const timer = setInterval(poll, 15000)
    return () => clearInterval(timer)
  }, [sheetId, sheetName])

  const value = useMemo(() => ({ ...state, refresh: async () => { const params = new URLSearchParams({ sheetId, sheetName, force: '1' }); const response = await fetch(`${BACKEND_URL}/api/sheets/data?${params}`, { cache: 'no-store', headers: { 'x-api-key': API_KEY } }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const payload = await response.json(); etagRef.current = payload.etag; setState({ tickets: payload.tickets || [], quarantined: payload.quarantined || [], headerIssues: payload.headerIssues || [], lastSync: new Date(payload.fetchedAt || Date.now()), status: 'live', error: null }); return payload.tickets || [] } }), [state, sheetId, sheetName])
  return <SheetsDataContext.Provider value={value}>{children}</SheetsDataContext.Provider>
}

export function useSheetsData() {
  const context = useContext(SheetsDataContext)
  if (!context) throw new Error('useSheetsData harus dipakai di dalam SheetsDataProvider')
  return context
}