import { Check, AlertCircle, Loader2, ExternalLink } from 'lucide-react'

export default function GoogleSheetsStatus({ syncStatus, lastSyncTime, sheetId }) {
  const getStatusDisplay = () => {
    switch (syncStatus) {
      case 'syncing':
        return {
          icon: <Loader2 size={16} className="animate-spin" />,
          text: 'Syncing...',
          color: 'text-blue-600 dark:text-blue-400'
        }
      case 'synced':
        return {
          icon: <Check size={16} />,
          text: 'Synced',
          color: 'text-emerald-600 dark:text-emerald-400'
        }
      case 'error':
        return {
          icon: <AlertCircle size={16} />,
          text: 'Sync Error',
          color: 'text-red-600 dark:text-red-400'
        }
      default:
        return {
          icon: <Check size={16} />,
          text: 'Connected',
          color: 'text-slate-600 dark:text-slate-400'
        }
    }
  }

  const status = getStatusDisplay()
  const timeStr = lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString('id-ID') : 'Not synced'
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`

  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-1.5 text-sm ${status.color}`}>
        {status.icon}
        <span>{status.text}</span>
      </div>
      {lastSyncTime && (
        <span className="text-xs text-slate-500 dark:text-slate-400">{timeStr}</span>
      )}
      <a
        href={sheetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
        title="Open Google Sheet"
      >
        <ExternalLink size={16} className="text-slate-600 dark:text-slate-400" />
      </a>
    </div>
  )
}
