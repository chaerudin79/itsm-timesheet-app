import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, X, Download, TrendingUp } from 'lucide-react'
import { useSession } from '../context/SessionContext'
import { filterTickets, uniqueValues } from '../utils/ticketUtils'
import ExportModal from '../components/ExportModal'
import ModernHeader from '../components/ModernHeader'
import ModernDataTable from '../components/ModernDataTable'
import { TICKET_TYPES } from '../utils/ticketTypes'

const STATUS_OPTIONS = ['CLOSED', 'OPEN']
const TYPE_OPTIONS = TICKET_TYPES

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

export default function ModernHistoryPage() {
  const { allTickets } = useSession()
  const [filters, setFilters] = useState({ search: '', site: '', status: '', engineer: '', type: '', dateFrom: '', dateTo: '' })
  const [showExport, setShowExport] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const sites = useMemo(() => uniqueValues(allTickets, 'requester'), [allTickets])
  const engineers = useMemo(() => uniqueValues(allTickets, 'engineer'), [allTickets])

  const filtered = useMemo(() => filterTickets(allTickets, filters), [allTickets, filters])
  const hasFilters = Object.values(filters).some(Boolean)

  const setFilter = (key, val) => {
    setFilters(f => ({ ...f, [key]: val }))
  }

  const clearFilters = () => {
    setFilters({ search: '', site: '', status: '', engineer: '', type: '', dateFrom: '', dateTo: '' })
  }

  const tableColumns = [
    { key: 'no', label: 'No' },
    { key: 'type', label: 'Type' },
    { key: 'requester', label: 'Requester' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Date' },
  ]

  return (
    <>
      <ModernHeader />
      <motion.div
        className="flex-1 overflow-y-auto bg-[var(--bg-base)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <div className="p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto w-full">
        {/* Title */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <h1 className="text-[28px] font-semibold text-white tracking-tight mb-1">Ticket History</h1>
          <p className="text-slate-500 text-[14px]">View and manage all tickets from your analysis sessions and imports.</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="rounded-lg border border-white/[0.07] bg-[#111113] p-5" variants={itemVariants}>
            <p className="text-slate-500 text-[12.5px] font-medium mb-2">Total Tickets</p>
            <p className="text-[26px] font-semibold text-white tabular-nums">{allTickets.length}</p>
          </motion.div>
          <motion.div className="rounded-lg border border-white/[0.07] bg-[#111113] p-5" variants={itemVariants}>
            <p className="text-slate-500 text-[12.5px] font-medium mb-2">Filtered Results</p>
            <p className="text-[26px] font-semibold text-[var(--accent)] tabular-nums">{filtered.length}</p>
          </motion.div>
          <motion.div className="rounded-lg border border-white/[0.07] bg-[#111113] p-5" variants={itemVariants}>
            <p className="text-slate-500 text-[12.5px] font-medium mb-2">Active Filters</p>
            <p className="text-[26px] font-semibold text-white tabular-nums">{Object.values(filters).filter(Boolean).length}</p>
          </motion.div>
        </motion.div>

        {/* Filter Bar */}
        <motion.div
          className="rounded-lg border border-white/[0.07] bg-[#111113] p-5 space-y-4"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              Filters
            </h2>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs px-2.5 py-1 rounded-md text-[#06B6D4] hover:bg-[#06B6D4]/10 flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear Filters
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-[#0A0A0B] border border-white/10 rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#06B6D4]/60"
            />
          </div>

            {/* Filter Selects - Show/Hide */}
            {showFilters && (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.15 }}
              >
              {/* Status */}
              <select
                value={filters.status}
                onChange={e => setFilter('status', e.target.value)}
                className="bg-[#0A0A0B] border border-white/10 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#06B6D4]/60"
              >
                <option value="">All Status</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Type */}
              <select
                value={filters.type}
                onChange={e => setFilter('type', e.target.value)}
                className="bg-[#0A0A0B] border border-white/10 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#06B6D4]/60"
              >
                <option value="">All Types</option>
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              {/* Requester */}
              <select
                value={filters.site}
                onChange={e => setFilter('site', e.target.value)}
                className="bg-[#0A0A0B] border border-white/10 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#06B6D4]/60"
              >
                <option value="">All Requesters</option>
                {sites.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Engineer */}
              <select
                value={filters.engineer}
                onChange={e => setFilter('engineer', e.target.value)}
                className="bg-[#0A0A0B] border border-white/10 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#06B6D4]/60"
              >
                <option value="">All Engineers</option>
                {engineers.map(e => <option key={e} value={e}>{e}</option>)}
              </select>

              {/* Date From */}
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilter('dateFrom', e.target.value)}
                className="bg-[#0A0A0B] border border-white/10 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#06B6D4]/60"
              />

              {/* Date To */}
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => setFilter('dateTo', e.target.value)}
                className="bg-[#0A0A0B] border border-white/10 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#06B6D4]/60"
              />
            </motion.div>
          )}

          {/* Toggle Filters & Export */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-300 border border-white/10 hover:bg-white/[0.06] transition-colors"
            >
              {showFilters ? 'Hide' : 'Show'} Advanced Filters
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="px-3 py-1.5 rounded-md text-sm font-semibold bg-[var(--brand-orange)] text-white hover:bg-[var(--brand-orange-hover)] ml-auto flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </motion.div>

        {/* Data Table */}
        <motion.div
          className="rounded-lg border border-white/[0.07] bg-[#111113] p-6"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold text-white">Ticket Results</h2>
            <span className="text-xs text-slate-500 font-medium">{filtered.length} tickets</span>
          </div>
          {filtered.length > 0 ? (
            <ModernDataTable
              data={filtered}
              columns={tableColumns}
              rowsPerPage={15}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-3 text-sm">No tickets match your filters</p>
              <button
                onClick={clearFilters}
                className="text-sm text-[#06B6D4] hover:underline"
              >
                Clear filters and try again
              </button>
            </div>
          )}
        </motion.div>

        {/* Spacing */}
        <div className="h-8" />
      </div>

      {/* Export Modal */}
      {showExport && (
        <ExportModal
          tickets={filtered}
          onClose={() => setShowExport(false)}
        />
      )}
      </motion.div>
    </>
  )
}
