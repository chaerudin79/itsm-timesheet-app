import { useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquarePlus, History, Settings, Moon, Sun, LogOut
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSession } from '../context/SessionContext'
import { getSheetData } from '../lib/googleSheetsApi'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analyzer', icon: MessageSquarePlus, label: 'Create Timesheet' },
  { to: '/history', icon: History, label: 'Ticket History' },
]

export default function AppLayout({ children }) {
  const { darkMode, toggleDarkMode, disconnect, getActiveAuth, sheetId } = useAuth()
  const { mergeTicketsFromSheets, allTickets } = useSession()
  const navigate = useNavigate()

  // Auto-load from Sheets on app startup
  useEffect(() => {
    const autoLoadSheetsOnStartup = async () => {
      try {
        if (!sheetId) return
        const auth = await getActiveAuth()
        const sheetsTickets = await getSheetData(auth.accessToken, sheetId)

        if (sheetsTickets.length > 0 && allTickets.length === 0) {
          // Only auto-load if there is no local data
          mergeTicketsFromSheets(sheetsTickets)
        }
      } catch (err) {
        console.error('Auto-load Sheets on startup failed:', err)
      }
    }

    // Delay slightly to ensure auth is ready
    const timer = setTimeout(autoLoadSheetsOnStartup, 500)
    return () => clearTimeout(timer)
  }, [sheetId, getActiveAuth, mergeTicketsFromSheets, allTickets.length])

  const handleDisconnect = () => {
    if (confirm('Disconnect from Google Sheets?')) {
      disconnect()
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* Sidebar Nav */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-500">ITSM NAC</p>
          <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
            Timesheet Manager
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive
                ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <Settings size={16} />
            Settings
          </NavLink>
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={handleDisconnect}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <LogOut size={16} />
            Disconnect
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
