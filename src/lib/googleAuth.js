// Google OAuth 2.0 for browser using modern Google Identity Services (GIS)
let gisLoaded = false

// Load GIS client library
export async function loadGoogleAPI() {
  return new Promise((resolve) => {
    if (gisLoaded) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      gisLoaded = true
      resolve()
    }
    document.head.appendChild(script)
  })
}

// Silent re-auth: tidak menampilkan popup consent, resolve null jika gagal
export async function silentAuth(clientId = null) {
  try {
    await loadGoogleAPI()
    const finalClientId = clientId || import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!finalClientId) return null

    return new Promise((resolve) => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: finalClientId,
          scope: 'https://www.googleapis.com/auth/spreadsheets',
          callback: (response) => {
            if (response.error || !response.access_token) {
              resolve(null)
              return
            }
            resolve({
              accessToken: response.access_token,
              expiresAt: Date.now() + (response.expires_in * 1000),
              clientId: finalClientId,
            })
          },
          error_callback: () => resolve(null),
        })
        // prompt: '' → silent, tidak muncul popup. Kalau user belum pernah grant,
        // GIS akan langsung callback dengan error (bukan popup), lalu resolve(null).
        client.requestAccessToken({ prompt: '' })
      } catch {
        resolve(null)
      }
    })
  } catch {
    return null
  }
}

export async function initializeOAuth(clientId = null) {
  try {
    await loadGoogleAPI()

    const finalClientId = clientId || import.meta.env.VITE_GOOGLE_CLIENT_ID

    if (!finalClientId) {
      throw new Error('Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID in .env')
    }

    return new Promise((resolve, reject) => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: finalClientId,
          scope: 'https://www.googleapis.com/auth/spreadsheets',
          callback: (response) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error))
              return
            }
            if (!response.access_token) {
              reject(new Error('No access token returned'))
              return
            }
            resolve({
              accessToken: response.access_token,
              expiresAt: Date.now() + (response.expires_in * 1000),
              clientId: finalClientId,
            })
          },
          error_callback: (err) => {
            reject(err)
          }
        })

        client.requestAccessToken({ prompt: 'consent' })
      } catch (err) {
        reject(err)
      }
    })
  } catch (error) {
    console.error('OAuth initialization failed:', error)
    throw error
  }
}

export async function getAccessToken(auth) {
  return auth.accessToken
}

export function signOut() {
  try {
    localStorage.removeItem('googleAuth')
    localStorage.removeItem('sheetId')
  } catch (error) {
    console.error('Sign out failed:', error)
  }
}
