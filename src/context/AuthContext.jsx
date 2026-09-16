import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { safeGetItem, safeSetItem } from '../lib/storageUtils'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // No more Google OAuth token here. Sheets access is handled entirely by
  // the backend (Service Account), so the frontend only needs to know
  // which spreadsheet to talk to, and whether the admin has logged in.
  const [isLoggedIn, setIsLoggedIn] = useState(() => safeGetItem('isLoggedIn', false))
  const [sheetId, setSheetId] = useState(() => safeGetItem('sheetId') || import.meta.env.VITE_GOOGLE_SHEET_ID || null)
  const [darkMode, setDarkMode] = useState(() => safeGetItem('darkMode', false))
  const [customRules, setCustomRules] = useState(() => safeGetItem('customRules', []))

  // Apply dark mode class
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    safeSetItem('darkMode', darkMode)
  }, [darkMode])

  const connect = useCallback(async (newSheetId) => {
    const sheet = newSheetId || safeGetItem('sheetId') || import.meta.env.VITE_GOOGLE_SHEET_ID
    setSheetId(sheet)
    setIsLoggedIn(true)
    safeSetItem('sheetId', sheet)
    safeSetItem('isLoggedIn', true)
  }, [])

  const disconnect = useCallback(() => {
    setIsLoggedIn(false)
    setSheetId(null)
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('sheetId')
  }, [])

  const updateCustomRules = useCallback((rules) => {
    setCustomRules(rules)
    safeSetItem('customRules', rules)
  }, [])

  const toggleDarkMode = useCallback(() => setDarkMode(m => !m), [])

  const isConnected = Boolean(isLoggedIn && sheetId)

  return (
    <AuthContext.Provider value={{
      sheetId,
      darkMode,
      customRules,
      isConnected,
      isAuthLoading: false, // kept for compatibility with existing effect guards
      connect,
      disconnect,
      toggleDarkMode,
      updateCustomRules,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
