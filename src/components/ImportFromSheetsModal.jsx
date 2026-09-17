import { useState } from 'react'
import { Download, AlertCircle } from 'lucide-react'
import { useSheetsSync } from '../hooks/useSheetsSync'
import { useSession } from '../context/SessionContext'

export default function ImportFromSheetsModal({ isOpen, onClose }) {
  const { importTickets, loading, error, clearError } = useSheetsSync()
  const { allTickets, mergeTicketsFromSheets } = useSession()
  const [importCount, setImportCount] = useState(0)

  const handleImport = async () => {
    try {
      const newTickets = await importTickets(allTickets)
      if (newTickets.length === 0) {
        alert('No new tickets found in Google Sheets. All tickets are already stored locally.')
        return
      }
      setImportCount(newTickets.length)
      mergeTicketsFromSheets(newTickets)
      setTimeout(() => {
        alert(`Successfully imported ${newTickets.length} tickets from Google Sheets`)
        onClose()
        setImportCount(0)
      }, 500)
    } catch (err) {
      console.error('Import failed:', err)
      alert(`Import failed: ${err.message}`)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-[10px] shadow-lg max-w-sm w-full mx-4 transition-colors">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-brand-primary" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-brand-text">
              Import from Google Sheets
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-brand-text-secondary mt-1">
            Fetch all manually-entered tickets from Google Sheets and add them to the application.
          </p>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-[8px] flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700 dark:text-red-200 font-medium">{error}</p>
              <button
                onClick={clearError}
                className="text-xs text-red-600 dark:text-red-300 underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {importCount > 0 && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-[8px]">
            <p className="text-sm font-medium">
              ✓ Successfully imported {importCount} new tickets
            </p>
          </div>
        )}

        <div className="p-6 flex gap-3">
          <button
            onClick={handleImport}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-brand-primary hover:bg-[#0891B2] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-[8px] font-semibold transition-colors"
          >
            {loading ? 'Loading...' : 'Import Now'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-brand-bg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-white rounded-[8px] font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
