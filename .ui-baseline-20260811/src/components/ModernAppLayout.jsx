import { useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquarePlus, History, Settings, Moon, Sun, LogOut
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSession } from '../context/SessionContext'
import { getSheetData } from '../lib/googleSheetsApi'
import { useState } from 'react'
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
  const [sidebarOpen, setSidebarOpen] = useState(true)

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
    <div className="flex h-screen bg-[#0B1220] text-white overflow-hidden">
      {/* Sidebar - Always visible */}
      <aside className="w-[260px] flex-shrink-0 bg-[#111827] border-r border-slate-800/50 flex flex-col h-screen">
        {/* Logo Section */}
        <div className="px-6 py-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-24 h-10 rounded-lg bg-white flex items-center justify-center p-2 shadow-sm shadow-black/20">
              <img
                src={bniLogo}
                alt="BNI"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">BNI ITSM NAC</h1>
              <p className="text-xs text-slate-400">Timesheet Manager</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, id }) => (
            <NavLink
              key={id}
              to={to}
              end={to === '/'}
            >
              {({ isActive }) => (
                <div className={`sidebar-nav-item ${isActive ? 'active bg-[#06B6D4]/20 text-[#06B6D4]' : ''}`}>
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {isActive && (
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-[#06B6D4] rounded-l-lg" />
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="px-3 py-4 border-t border-slate-800/50 space-y-2">
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
            <span>Disconnect</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto ml-4">
        {children}
      </main>
    </div>
  )
}
