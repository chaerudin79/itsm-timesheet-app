import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function GoogleSheetsModal({ onSetup }) {
  const [clientId, setClientId] = useState(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || '')
  const [sheetId, setSheetId] = useState(() => import.meta.env.VITE_GOOGLE_SHEET_ID || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSetup = async () => {
    setError('')
    
    if (!clientId.trim() || !sheetId.trim()) {
      setError('Please fill in both Client ID and Sheet ID')
      return
    }

    setLoading(true)
    try {
      await onSetup(clientId, sheetId)
    } catch (err) {
      setError(err.message || 'Setup failed')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-950">
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
          ITSM NAC Timesheet
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Setup Google Sheets untuk menyimpan tiket
        </p>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-3 rounded">
            <p className="font-semibold mb-2">Setup Guide:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Buat Google Sheet kosong di sheets.google.com</li>
              <li>Copy Sheet ID dari URL</li>
              <li>Setup OAuth di Google Cloud Console</li>
              <li>Copy Client ID dari credentials</li>
            </ol>
          </div>

          {/* Client ID Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Google OAuth Client ID
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="123456789-abc...apps.googleusercontent.com"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sheet ID Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Google Sheet ID
            </label>
            <input
              type="text"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="1a2b3c4d5e6f..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded text-sm">
              {error}
            </div>
          )}

          {/* Setup Button */}
          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              'Authenticate with Google'
            )}
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
          Your credentials will be saved locally in browser storage
        </p>
      </div>
    </div>
  )
}
