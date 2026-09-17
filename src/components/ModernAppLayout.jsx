import { useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquarePlus, History, Settings, Moon, Sun, LogOut
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSession } from '../context/SessionContext'
import { getSheetData } from '../lib/googleSheetsApi'
import bniLogo from '../assets/bni-logo.png'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { to: '/analyzer', icon: MessageSquarePlus, label: 'Create Timesheet', id: 'analyzer' },
  { to: '/history', icon: History, label: 'Ticket History', id: 'history' },
]

export default function ModernAppLayout({ children }) {
  const { darkMode, toggleDarkMode, disconnect, sheetId, isAuthLoading } = useAuth()
  const { setSheetsTickets, setLastSheetsSync } = useSession()
  const navigate = useNavigate()

  // Auto-load from Sheets on app startup.
  useEffect(() => {
    if (isAuthLoading || !sheetId) return
    let isMounted = true

    const autoLoadSheetsOnStartup = async () => {
      try {
        const sheetsTickets = await getSheetData(sheetId)

        if (isMounted && Array.isArray(sheetsTickets)) {
          setSheetsTickets(sheetsTickets.filter(t => !/^\d{5,6}$/.test(t.requester)))
          setLastSheetsSync(new Date())
        }
      } catch (err) {
        console.error('Auto-load Sheets on startup failed:', err)
      }
    }

    const timer = setTimeout(autoLoadSheetsOnStartup, 300)
    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [isAuthLoading, sheetId, setSheetsTickets, setLastSheetsSync])

  const handleDisconnect = () => {
    if (confirm('Log out?')) {
      disconnect()
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-brand-bg text-slate-900 dark:text-brand-text overflow-hidden">
      {/* Sidebar - Always visible */}
      <aside className="w-[244px] flex-shrink-0 bg-white dark:bg-brand-surface border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen transition-colors duration-150">
        {/* Logo Section */}
        <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-20 h-9 rounded-md bg-white border border-slate-200 dark:border-slate-700/60 flex items-center justify-center p-1.5 shadow-sm">
              <img
                src={bniLogo}
                alt="BNI"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-[13px] font-semibold text-slate-900 dark:text-brand-text">ITSM NAC BNI</h1>
              <p className="text-[11px] text-slate-500 dark:text-brand-text-secondary">Timesheet Manager</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, id }) => (
            <NavLink
              key={id}
              to={to}
              end={to === '/'}
            >
              {({ isActive }) => (
                <div className={`sidebar-nav-item ${isActive ? 'active' : ''}`}>
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {isActive && (
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-primary rounded-r" />
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <NavLink
            to="/settings"
          >
            {({ isActive }) => (
              <div className={`sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </div>
            )}
          </NavLink>

          <button
            onClick={toggleDarkMode}
            className="sidebar-nav-item w-full justify-start"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            onClick={handleDisconnect}
            className="sidebar-nav-item w-full justify-start text-brand-danger hover:text-brand-danger hover:bg-brand-danger/10"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto min-w-0 bg-[#F8FAFC] dark:bg-brand-bg transition-colors duration-150">
        {children}
      </main>
    </div>
  )
}
