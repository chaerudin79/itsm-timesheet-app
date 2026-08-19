import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { initializeOAuth, silentAuth } from '../lib/googleAuth'
import { safeGetItem, safeSetItem } from '../lib/storageUtils'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [googleAuth, setGoogleAuth] = useState(null)
  const [sheetId, setSheetId] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true) // true sampai silentAuth selesai
  const [darkMode, setDarkMode] = useState(() => safeGetItem('darkMode', false))
  const [customRules, setCustomRules] = useState(() => safeGetItem('customRules', []))

  // Load persisted auth on mount.
  // accessToken TIDAK disimpan ke localStorage — hanya { clientId, expiresAt }.
  // Saat reload, lakukan silent re-auth via GIS tanpa popup.
  useEffect(() => {
    const authMeta = safeGetItem('googleAuth') // { clientId, expiresAt } — no accessToken
    const sheet = safeGetItem('sheetId') || import.meta.env.VITE_GOOGLE_SHEET_ID
    if (authMeta?.clientId && sheet) {
      setSheetId(sheet)
      if (authMeta.clientId === 'mock' || authMeta.clientId === 'offline') {
        setGoogleAuth({
          accessToken: 'mock-access-token',
          expiresAt: authMeta.expiresAt,
          clientId: authMeta.clientId,
        })
        setIsAuthLoading(false)
      } else {
        silentAuth(authMeta.clientId).then(freshAuth => {
          if (freshAuth) setGoogleAuth(freshAuth)
          setIsAuthLoading(false)
        })
      }
    } else {
      setIsAuthLoading(false)
    }
  }, [])

  // Apply dark mode class
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    safeSetItem('darkMode', darkMode)
  }, [darkMode])

  const connect = useCallback(async (clientId, newSheetId) => {
    let auth
    if (clientId === 'mock' || clientId === 'offline') {
      auth = {
        accessToken: 'mock-access-token',
        expiresAt: Date.now() + 3600 * 1000,
        clientId,
      }
    } else {
      auth = await initializeOAuth(clientId)
    }
    setGoogleAuth(auth)
    setSheetId(newSheetId)
    // Simpan hanya metadata — accessToken TIDAK masuk localStorage
    safeSetItem('googleAuth', { clientId: auth.clientId, expiresAt: auth.expiresAt })
    safeSetItem('sheetId', newSheetId)
  }, [])

  const reauth = useCallback(async () => {
    const clientId = googleAuth?.clientId || import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (clientId === 'mock' || clientId === 'offline') {
      const auth = {
        accessToken: 'mock-access-token',
        expiresAt: Date.now() + 3600 * 1000,
        clientId,
      }
      setGoogleAuth(auth)
      safeSetItem('googleAuth', { clientId: auth.clientId, expiresAt: auth.expiresAt })
      return auth
    }
    // Coba silent dulu, fallback ke consent popup kalau gagal
    const auth = await silentAuth(clientId) || await initializeOAuth(clientId)
    setGoogleAuth(auth)
    // Simpan hanya metadata — accessToken TIDAK masuk localStorage
    safeSetItem('googleAuth', { clientId: auth.clientId, expiresAt: auth.expiresAt })
    return auth
  }, [googleAuth])

  const getActiveAuth = useCallback(async () => {
    if (!googleAuth) throw new Error('Not authenticated')
    if (googleAuth.clientId === 'mock' || googleAuth.clientId === 'offline') {
      return googleAuth
    }
    if (!googleAuth.expiresAt || Date.now() > googleAuth.expiresAt - 60000) {
      return await reauth()
    }
    return googleAuth
  }, [googleAuth, reauth])

  const disconnect = useCallback(() => {
    setGoogleAuth(null)
    setSheetId(null)
    localStorage.removeItem('googleAuth')
    localStorage.removeItem('sheetId')
  }, [])

  const updateCustomRules = useCallback((rules) => {
    setCustomRules(rules)
    safeSetItem('customRules', rules)
  }, [])

  const toggleDarkMode = useCallback(() => setDarkMode(m => !m), [])

  const isConnected = Boolean(googleAuth && sheetId)

  return (
    <AuthContext.Provider value={{
      googleAuth,
      sheetId,
      darkMode,
      customRules,
      isConnected,
      isAuthLoading,
      connect,
      reauth,
      getActiveAuth,
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
