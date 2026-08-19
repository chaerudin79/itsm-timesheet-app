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
  const { darkMode, toggleDarkMode, disconnect, getActiveAuth, sheetId, isAuthLoading } = useAuth()
  const { mergeTicketsFromSheets, allTickets } = useSession()
  const navigate = useNavigate()

  // Auto-load from Sheets on app startup.
  // Guard: tunggu isAuthLoading=false dulu supaya getActiveAuth() tidak throw 'Not authenticated'
  // akibat race dengan silentAuth() yang sedang berjalan di background.
  useEffect(() => {
    if (isAuthLoading) return
    const autoLoadSheetsOnStartup = async () => {
      try {
        if (!sheetId) return
        const auth = await getActiveAuth()
        const sheetsTickets = await getSheetData(auth.accessToken, sheetId)

        if (sheetsTickets.length > 0 && allTickets.length === 0) {
          mergeTicketsFromSheets(sheetsTickets)
        }
      } catch (err) {
        console.error('Auto-load Sheets on startup failed:', err)
      }
    }

    const timer = setTimeout(autoLoadSheetsOnStartup, 500)
    return () => clearTimeout(timer)
  }, [isAuthLoading, sheetId, getActiveAuth, mergeTicketsFromSheets, allTickets.length])

  const handleDisconnect = () => {
    if (confirm('Disconnect from Google Sheets?')) {
      disconnect()
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="flex h-screen bg-[var(--bg-base)] text-white overflow-hidden">
      {/* Sidebar - Always visible */}
      <aside className="w-[244px] flex-shrink-0 bg-[#101316] border-r border-[#252B31] flex flex-col h-screen">
        {/* Logo Section */}
        <div className="px-5 py-5 border-b border-[#252B31]">
          <div className="flex items-center gap-3">
            <div className="w-20 h-9 rounded-md bg-white flex items-center justify-center p-1.5">
              <img
                src={bniLogo}
                alt="BNI"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-[13px] font-semibold text-white">ITSM NAC BNI</h1>
              <p className="text-[11px] text-slate-500">Timesheet Manager</p>
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
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--accent)] rounded-r" />
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="px-3 py-4 border-t border-[#252B31] space-y-1">
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
            className="sidebar-nav-item w-full justify-start text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
