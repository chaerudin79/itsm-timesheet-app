import { useState } from 'react'
import { Download, X } from 'lucide-react'
import { exportToCSV, exportToJSON } from '../lib/ticketOperations'

export default function ExportModal({ tickets, onClose }) {
  const [exportFormat, setExportFormat] = useState('csv')

  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `timesheet-${timestamp}`

    if (exportFormat === 'csv') {
      exportToCSV(tickets, `${filename}.csv`)
    } else if (exportFormat === 'json') {
      exportToJSON(tickets, `${filename}.json`)
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            Export Tickets
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-surface-raised)] rounded-[8px] transition-colors focus:outline-none"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Exporting {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
        </p>

        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-3 p-3 border border-[var(--border-subtle)] rounded-[8px] cursor-pointer hover:bg-[var(--bg-surface-raised)] transition-colors">
            <input
              type="radio"
              value="csv"
              checked={exportFormat === 'csv'}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-4 h-4 text-[var(--accent)] focus:ring-[var(--accent)]/20"
            />
            <div>
              <p className="font-medium text-white">CSV</p>
              <p className="text-xs text-slate-400">Excel, Sheets compatible</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-[var(--border-subtle)] rounded-[8px] cursor-pointer hover:bg-[var(--bg-surface-raised)] transition-colors">
            <input
              type="radio"
              value="json"
              checked={exportFormat === 'json'}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-4 h-4 text-[var(--accent)] focus:ring-[var(--accent)]/20"
            />
            <div>
              <p className="font-medium text-white">JSON</p>
              <p className="text-xs text-slate-400">For backup & import</p>
            </div>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[var(--bg-surface-raised)] hover:bg-slate-800 text-white rounded-[8px] border border-[var(--border-subtle)] hover:border-white/20 transition-colors font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[#0891B2] text-black rounded-[8px] transition-colors font-semibold text-sm"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>
    </div>
  )
}
