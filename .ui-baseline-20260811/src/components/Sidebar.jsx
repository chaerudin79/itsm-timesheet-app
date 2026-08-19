import { Plus, Trash2, Moon, Sun, Settings } from 'lucide-react'

export default function Sidebar({
  sessions,
  activeSessionId,
  onCreateSession,
  onSelectSession,
  onDeleteSession,
  darkMode,
  onToggleDarkMode,
  onOpenSettings
}) {
  return (
    <div className="w-60 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">
          ITSM NAC
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">Timesheet Analyzer</p>
      </div>

      {/* New Session Button */}
      <button
        onClick={onCreateSession}
        className="m-3 flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Plus size={18} />
        <span className="text-sm font-medium">New Session</span>
      </button>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {sessions.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 p-3">
            No sessions yet
          </p>
        ) : (
          sessions.map(session => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`group p-3 rounded-lg cursor-pointer transition-colors mb-1 flex items-center justify-between ${
                activeSessionId === session.id
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(session.updatedAt).toLocaleDateString('id-ID')}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteSession(session.id)
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-all"
              >
                <Trash2 size={16} className="text-red-600 dark:text-red-400" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-2">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>

        <button
          onClick={onToggleDarkMode}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
        >
          {darkMode ? (
            <>
              <Sun size={18} />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={18} />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
