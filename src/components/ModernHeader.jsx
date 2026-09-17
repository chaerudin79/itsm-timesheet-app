import { motion } from 'framer-motion'
import { Search, Bell, RefreshCw, Download, Clock, Lock, X } from 'lucide-react'
import { useState } from 'react'

export default function ModernHeader({ onRefresh, onImport, lastSync, searchQuery: controlledSearchQuery, onSearchChange }) {
  const [localSearchQuery, setLocalSearchQuery] = useState('')
  const searchQuery = controlledSearchQuery ?? localSearchQuery

  const handleSearchChange = (value) => {
    if (onSearchChange) {
      onSearchChange(value)
      return
    }
    setLocalSearchQuery(value)
  }

  return (
    <motion.div
      className="px-5 lg:px-8 py-3.5 bg-white dark:bg-brand-surface border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-150"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 lg:gap-6">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[220px] max-w-[440px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-brand-text-secondary" />
          <input
            type="text"
            placeholder="Search tickets, site, engineer..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-8 py-2 text-sm rounded-[8px] bg-slate-100 dark:bg-brand-bg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-brand-text placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-primary transition-colors"
            aria-label="Search tickets"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Privacy Badge */}
          <div className="relative group">
            <div
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-[8px] text-xs font-semibold cursor-pointer transition-colors duration-200"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Data Masked</span>
            </div>
            
            {/* Popover / Tooltip */}
            <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-[10px] shadow-xl text-xs text-slate-600 dark:text-slate-300 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-50">
              <p className="font-bold text-slate-900 dark:text-white mb-1">🔒 Kebijakan Masking Data</p>
              <p className="leading-relaxed">Alamat MAC & IP disamarkan secara otomatis di browser sebelum teks chat dikirim ke API kecerdasan buatan demi privasi data.</p>
            </div>
          </div>

          {/* Last Sync Badge */}
          {lastSync && (
            <div
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-brand-bg rounded-[8px] text-xs text-slate-600 dark:text-brand-text-secondary border border-slate-200 dark:border-slate-800"
            >
              <Clock className="w-3 h-3" />
              <span className="hidden xl:inline">Last sync: {lastSync.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-[8px] text-slate-600 dark:text-brand-text-secondary hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-brand-bg transition-colors"
            title="Refresh from Google Sheets"
            aria-label="Refresh from Google Sheets"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Import Button */}
          <button
            onClick={onImport}
            className="p-2.5 rounded-[8px] text-slate-600 dark:text-brand-text-secondary hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-brand-bg transition-colors"
            title="Import from Google Sheets"
            aria-label="Import from Google Sheets"
          >
            <Download className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <button
            className="p-2.5 rounded-[8px] text-slate-600 dark:text-brand-text-secondary hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-brand-bg relative transition-colors"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User Avatar */}
          <div
            className="w-10 h-10 rounded-[8px] bg-slate-100 dark:bg-brand-bg border border-slate-200 dark:border-slate-800 flex items-center justify-center font-bold text-brand-primary text-sm cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors duration-150"
            aria-label="User profile"
          >
            EN
          </div>
        </div>
      </div>
    </motion.div>
  )
}
