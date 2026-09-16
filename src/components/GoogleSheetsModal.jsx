import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { safeGetItem } from '../lib/storageUtils'

function getStoredSheetId() {
  return safeGetItem('sheetId') || import.meta.env.VITE_GOOGLE_SHEET_ID || ''
}

export default function GoogleSheetsModal({ onSetup }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSetup = async () => {
    setError('')

    if (username !== 'admin' || password !== 'password') {
      setError('Invalid username or password')
      return
    }

    setLoading(true)
    try {
      await onSetup(getStoredSheetId())
    } catch (err) {
      setError(err.message || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0A0A0B] text-white">
      <div className="p-8 w-full max-w-md bg-[#111113] border border-white/[0.06] rounded-xl shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">
          ITSM NAC Timesheet
        </h1>
        <p className="text-slate-400 mb-8 text-center text-sm">
          Login Administrator
        </p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-3 py-2 border border-white/10 rounded-lg bg-[#0A0A0B] text-white placeholder-slate-500 focus:outline-none focus:border-[#06B6D4]/60 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSetup()
              }}
              className="w-full px-3 py-2 border border-white/10 rounded-lg bg-[#0A0A0B] text-white placeholder-slate-500 focus:outline-none focus:border-[#06B6D4]/60 transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-white text-black hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-lg font-medium transition-colors mt-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Logging in...</span>
              </>
            ) : (
              'Login'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
