import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Clock, CheckCircle, AlertCircle, ChevronDown, UploadCloud } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { useAuth } from '../context/AuthContext'
import { useSheetsSync } from '../hooks/useSheetsSync'
import { getSummaryStats, groupByDate, groupByMonth } from '../utils/ticketUtils'
import { formatResolutionTime } from '../utils/dateUtils'
import ModernHeader from '../components/ModernHeader'
import ModernDataTable from '../components/ModernDataTable'
import ImportFromSheetsModal from '../components/ImportFromSheetsModal'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts'

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

const REALTIME_SYNC_INTERVAL_MS = 30000

function mergeSheetsWithLocal(sheetsTickets, localTickets) {
  const keyFor = (ticket) => [
    ticket.problem,
    ticket.requester,
    ticket.date,
    ticket.action,
    ticket.type,
  ].map(value => String(value || '').trim().toLowerCase()).join('|')

  // Keep local-only tickets visible until they have been synced to Sheets.
  const sheetsCounts = new Map()
  sheetsTickets.forEach(ticket => {
    const key = keyFor(ticket)
    sheetsCounts.set(key, (sheetsCounts.get(key) || 0) + 1)
  })

  const unsyncedLocalTickets = localTickets.filter(ticket => {
    const key = keyFor(ticket)
    const remaining = sheetsCounts.get(key) || 0
    if (remaining > 0) {
      sheetsCounts.set(key, remaining - 1)
      return false
    }
    return true
  })

  return [...sheetsTickets, ...unsyncedLocalTickets]
}

function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate())
}

function addYears(date, years) {
  return new Date(date.getFullYear() + years, date.getMonth(), date.getDate())
}

function getDashboardRange(dateRange, customStartDate = '', customEndDate = '') {
  const now = new Date()
  const thisWeekStart = startOfWeek(now)

  if (dateRange === 'week') {
    const start = addDays(thisWeekStart, -7)
    const end = thisWeekStart
    return { start, end, previousStart: addDays(start, -7), previousEnd: start, label: 'vs previous week' }
  }

  if (dateRange === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start, end, previousStart: addMonths(start, -1), previousEnd: start, label: 'vs previous month' }
  }

  if (dateRange === '3months') {
    const start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start, end, previousStart: addMonths(start, -3), previousEnd: start, label: 'vs previous 3 months' }
  }

  if (dateRange === 'year') {
    const start = new Date(now.getFullYear() - 1, 0, 1)
    const end = new Date(now.getFullYear(), 0, 1)
    return { start, end, previousStart: addYears(start, -1), previousEnd: start, label: 'vs previous year' }
  }

  if (dateRange === 'custom' && customStartDate && customEndDate) {
    const start = new Date(customStartDate)
    const end = addDays(new Date(customEndDate), 1)
    const durationMs = end - start
    return {
      start,
      end,
      previousStart: new Date(start.getTime() - durationMs),
      previousEnd: start,
      label: 'vs previous period',
    }
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { start, end, previousStart: addMonths(start, -1), previousEnd: start, label: 'vs previous month' }
}

function isWithinRange(ticket, range) {
  const date = new Date(ticket.date || ticket.taskStarted || 0)
  return !isNaN(date) && date >= range.start && date < range.end
}

function formatTrend(current, previous, trendLabel, lowerIsBetter = false) {
  if (previous === 0 && current === 0) return { label: `0% ${trendLabel}`, color: '#22C55E' }
  if (previous === 0) return { label: `+100% ${trendLabel}`, color: lowerIsBetter ? '#EF4444' : '#22C55E' }

  const change = ((current - previous) / previous) * 100
  const rounded = Math.round(change)
  const improved = lowerIsBetter ? change <= 0 : change >= 0
  const sign = rounded > 0 ? '+' : ''
  return {
    label: `${sign}${rounded}% ${trendLabel}`,
    color: improved ? '#22C55E' : '#EF4444',
  }
}

function Sparkline({ data, color }) {
  const [hoveredPoint, setHoveredPoint] = useState(null)

  if (!data || data.length < 2) {
    return <div className="h-[35px]" />
  }

  const values = data.map(d => d.value)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1

  const width = 140
  const height = 35

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((d.value - min) / range) * (height - 8) - 4
    return { x, y, value: d.value, date: d.date }
  })

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <div className="w-[140px] h-[35px] relative self-end">
      <svg className="overflow-visible" width={width} height={height}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            className="fill-[#111113] stroke-current cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
            style={{ color: color }}
            onMouseEnter={() => setHoveredPoint(p)}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        ))}
      </svg>
      {hoveredPoint && (
        <div className="absolute bottom-full right-0 mb-1.5 bg-[#1A1A1E] border border-white/10 text-[9px] text-white px-2 py-0.5 rounded whitespace-nowrap z-25 pointer-events-none">
          {hoveredPoint.date}: {hoveredPoint.value.toFixed(0)}
        </div>
      )}
    </div>
  )
}

export default function ModernDashboard() {
  const navigate = useNavigate()
  const { allTickets } = useSession()
  const { isAuthLoading } = useAuth()
  const { loadSheetsData, auditLocalVsSheets, syncMissingTickets } = useSheetsSync()
  const [showImportModal, setShowImportModal] = useState(false)
  const [displayTickets, setDisplayTickets] = useState(allTickets)
  const [lastSheetsSync, setLastSheetsSync] = useState(null)
  const [sheetAudit, setSheetAudit] = useState(null)
  const [syncMissingStatus, setSyncMissingStatus] = useState('idle')
  const [dateRange, setDateRange] = useState('all') // 'all', 'week', 'month', '3months', 'custom'
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [headerSearch, setHeaderSearch] = useState('')

  // Custom states for interactive charts
  const [siteLimit, setSiteLimit] = useState(10)
  const [siteSearch, setSiteSearch] = useState('')
  const [activeTypeIndex, setActiveTypeIndex] = useState(null)

  // URL search params and dropdown states for quick filter
  const [searchParams, setSearchParams] = useSearchParams()
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false)
  const [dropdownSearch, setDropdownSearch] = useState('')
  const hasRunInitialSheetAudit = useRef(false)

  const loadRealtimeSheetsData = useCallback(async () => {
    const sheetsTickets = await loadSheetsData()
    const audit = await auditLocalVsSheets(allTickets, sheetsTickets)
    setSheetAudit(audit)
    setDisplayTickets(mergeSheetsWithLocal(sheetsTickets, allTickets))
    setLastSheetsSync(new Date())
  }, [allTickets, auditLocalVsSheets, loadSheetsData])

  // Auto-load from Sheets after local sessions are available.
  // Guard: tunggu isAuthLoading=false supaya tidak race dengan silentAuth().
  useEffect(() => {
    if (isAuthLoading || hasRunInitialSheetAudit.current || allTickets.length === 0) return
    hasRunInitialSheetAudit.current = true

    const autoLoadSheets = async () => {
      try {
        await loadRealtimeSheetsData()
      } catch (err) {
        console.error('Auto-load Sheets failed:', err)
      }
    }

    autoLoadSheets()
  }, [isAuthLoading, allTickets.length, loadRealtimeSheetsData])

  useEffect(() => {
    if (allTickets.length === 0) return

    const timer = setInterval(() => {
      loadRealtimeSheetsData().catch(err => {
        console.error('Realtime Sheets sync failed:', err)
      })
    }, REALTIME_SYNC_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [allTickets.length, loadRealtimeSheetsData])

  // Update display when local data changes
  useEffect(() => {
    setDisplayTickets(prev => {
      if (lastSheetsSync) return mergeSheetsWithLocal(prev, allTickets)
      return allTickets
    })
  }, [allTickets, lastSheetsSync])

  // Refresh data from Sheets
  const handleRefreshSheets = async () => {
    try {
      await loadRealtimeSheetsData()
    } catch (err) {
      console.error('Refresh failed:', err)
    }
  }

  const handleSyncMissingTickets = async () => {
    setSyncMissingStatus('syncing')
    try {
      const result = await syncMissingTickets(allTickets)
      setSheetAudit({
        localCount: result.localCount,
        sheetsCount: result.sheetsCount + result.appended,
        missingTickets: [],
        missingCount: 0,
      })
      setLastSheetsSync(new Date())
      await loadRealtimeSheetsData()
      setSyncMissingStatus('synced')
      setTimeout(() => setSyncMissingStatus('idle'), 3000)
    } catch (err) {
      console.error('Sync missing tickets failed:', err)
      setSyncMissingStatus('error')
    }
  }

  // Filter tickets by date range
  const filteredByDate = useMemo(() => {
    if (dateRange === 'all') return displayTickets

    const range = getDashboardRange(dateRange, customStartDate, customEndDate)
    return displayTickets.filter(ticket => {
      return isWithinRange(ticket, range)
    })
  }, [displayTickets, dateRange, customStartDate, customEndDate])

  const selectedTypes = useMemo(() => {
    const val = searchParams.get('type')
    return val ? val.split(',').filter(Boolean) : []
  }, [searchParams])

  const selectedSites = useMemo(() => {
    const val = searchParams.get('site')
    return val ? val.split(',').filter(Boolean) : []
  }, [searchParams])

  const toggleTypeFilter = useCallback((type) => {
    const newParams = new URLSearchParams(searchParams)
    if (type === 'all') {
      newParams.delete('type')
    } else {
      let current = newParams.get('type') ? newParams.get('type').split(',') : []
      if (current.includes(type)) {
        current = current.filter(t => t !== type)
      } else {
        current.push(type)
      }
      if (current.length === 0) {
        newParams.delete('type')
      } else {
        newParams.set('type', current.join(','))
      }
    }
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const toggleSiteFilter = useCallback((site) => {
    const newParams = new URLSearchParams(searchParams)
    let current = newParams.get('site') ? newParams.get('site').split(',') : []
    if (current.includes(site)) {
      current = current.filter(s => s !== site)
    } else {
      current.push(site)
    }
    if (current.length === 0) {
      newParams.delete('site')
    } else {
      newParams.set('site', current.join(','))
    }
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const clearSiteFilters = useCallback(() => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('site')
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const allSitesList = useMemo(() => {
    return [...new Set(displayTickets.map(t => t.requester).filter(Boolean))].sort()
  }, [displayTickets])

  const filteredDashboardTickets = useMemo(() => {
    let result = filteredByDate
    if (selectedTypes.length > 0) {
      result = result.filter(t => selectedTypes.includes(t.type))
    }
    if (selectedSites.length > 0) {
      result = result.filter(t => selectedSites.includes(t.requester))
    }
    const query = headerSearch.trim().toLowerCase()
    if (query) {
      result = result.filter(ticket => [
        ticket.no,
        ticket.problem,
        ticket.requester,
        ticket.engineer,
        ticket.action,
        ticket.remarks,
        ticket.type,
        ticket.status,
      ].some(value => String(value || '').toLowerCase().includes(query)))
    }
    return result
  }, [filteredByDate, selectedTypes, selectedSites, headerSearch])

  const stats = useMemo(() => getSummaryStats(filteredDashboardTickets), [filteredDashboardTickets])
  const monthTrendStats = useMemo(() => {
    const trendRange = getDashboardRange(dateRange, customStartDate, customEndDate)
    const currentRange = { start: trendRange.start, end: trendRange.end }
    const previousRange = { start: trendRange.previousStart, end: trendRange.previousEnd }
    let baseTickets = displayTickets

    if (selectedTypes.length > 0) {
      baseTickets = baseTickets.filter(t => selectedTypes.includes(t.type))
    }
    if (selectedSites.length > 0) {
      baseTickets = baseTickets.filter(t => selectedSites.includes(t.requester))
    }

    const currentStats = getSummaryStats(baseTickets.filter(ticket => isWithinRange(ticket, currentRange)))
    const previousStats = getSummaryStats(baseTickets.filter(ticket => isWithinRange(ticket, previousRange)))

    return {
      total: formatTrend(currentStats.total, previousStats.total, trendRange.label),
      closed: formatTrend(currentStats.closed, previousStats.closed, trendRange.label),
      open: formatTrend(currentStats.open, previousStats.open, trendRange.label, true),
      resolution: formatTrend(currentStats.avgResolution, previousStats.avgResolution, trendRange.label, true),
    }
  }, [displayTickets, selectedTypes, selectedSites, dateRange, customStartDate, customEndDate])
  const dailyData = useMemo(() => groupByDate(filteredDashboardTickets), [filteredDashboardTickets])
  const monthlyData = useMemo(() => groupByMonth(filteredDashboardTickets), [filteredDashboardTickets])

  const typeColorMap = useMemo(() => ({
    'Problem': '#F87171',
    'Request Task': '#7DD3C0',
    'Change Request': '#FBBF6B',
    'Troubleshoot': '#A5A8FF'
  }), [])

  const typeData = useMemo(() => {
    const total = stats.total || 1
    return Object.entries(stats.byType)
      .map(([name, value]) => {
        const percentage = ((value / total) * 100).toFixed(1)
        const color = typeColorMap[name] || '#64748B'
        return { name, value, percentage: parseFloat(percentage), color }
      })
      .sort((a, b) => b.value - a.value)
  }, [stats.byType, stats.total, typeColorMap])

  const siteData = useMemo(() => {
    return Object.entries(stats.bySite)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [stats.bySite])

  const filteredSiteData = useMemo(() => {
    let data = siteData
    if (siteSearch.trim()) {
      data = data.filter(d => d.name.toLowerCase().includes(siteSearch.toLowerCase()))
    }
    if (siteLimit !== Infinity) {
      data = data.slice(0, siteLimit)
    }
    return data
  }, [siteData, siteSearch, siteLimit])

  // Sort by newest first
  const latestTickets = useMemo(() => {
    return [...filteredDashboardTickets].sort((a, b) => {
      const dateA = new Date(a.date || a.taskStarted || 0)
      const dateB = new Date(b.date || b.taskStarted || 0)
      return dateB - dateA
    }).slice(0, 5)
  }, [filteredDashboardTickets])

  const getSparklineData = useCallback((tickets, type) => {
    const dates = [...new Set(tickets.map(t => t.date).filter(Boolean))].sort((a, b) => new Date(a) - new Date(b))
    const lastNDates = dates.slice(-30)

    if (lastNDates.length === 0) {
      return []
    }

    const dataPoints = lastNDates.map(d => {
      const dayTickets = tickets.filter(t => t.date === d)
      let value = 0
      if (type === 'total') {
        value = dayTickets.length
      } else if (type === 'closed') {
        value = dayTickets.filter(t => t.status === 'CLOSED').length
      } else if (type === 'open') {
        value = dayTickets.filter(t => t.status === 'OPEN').length
      } else if (type === 'resolution') {
        const valid = dayTickets.filter(t => t.resolutionTime)
        if (valid.length > 0) {
          const totalSecs = valid.reduce((sum, t) => {
            const parts = t.resolutionTime.split(':')
            const h = parseInt(parts[0]) || 0
            const m = parseInt(parts[1]) || 0
            const s = parseInt(parts[2]) || 0
            return sum + (h * 3600 + m * 60 + s)
          }, 0)
          value = totalSecs / valid.length
        }
      }
      return { date: d, value }
    })

    if (dataPoints.length === 1) {
      return [{ ...dataPoints[0], date: 'Prev' }, dataPoints[0]]
    }

    return dataPoints
  }, [])

  const sparklineDataTotal = useMemo(() => getSparklineData(filteredDashboardTickets, 'total'), [filteredDashboardTickets, getSparklineData])
  const sparklineDataClosed = useMemo(() => getSparklineData(filteredDashboardTickets, 'closed'), [filteredDashboardTickets, getSparklineData])
  const sparklineDataOpen = useMemo(() => getSparklineData(filteredDashboardTickets, 'open'), [filteredDashboardTickets, getSparklineData])
  const sparklineDataResolution = useMemo(() => getSparklineData(filteredDashboardTickets, 'resolution'), [filteredDashboardTickets, getSparklineData])

  const getTrendColor = useCallback((data, type) => {
    if (!data || data.length < 2) return '#22C55E'
    const firstVal = data[0].value
    const lastVal = data[data.length - 1].value

    if (type === 'open') {
      return lastVal <= firstVal ? '#22C55E' : '#EF4444'
    }
    if (type === 'resolution') {
      return lastVal <= firstVal ? '#22C55E' : '#EF4444'
    }
    return lastVal >= firstVal ? '#22C55E' : '#EF4444'
  }, [])

  // Table data
  const tableColumns = [
    { key: 'no', label: 'No' },
    { key: 'type', label: 'Type' },
    { key: 'requester', label: 'Requester' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Date' },
  ]

  if (displayTickets.length === 0) {
    return (
      <>
        <ModernHeader
          onRefresh={handleRefreshSheets}
          onImport={() => setShowImportModal(true)}
          lastSync={lastSheetsSync}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0A0A0B] min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            <div className="w-12 h-12 bg-white/[0.05] rounded-lg flex items-center justify-center mx-auto mb-5">
              <BarChart3 className="w-6 h-6 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1.5">No Tickets Yet</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-md">
              Start by creating a new timesheet or importing tickets from Google Sheets
            </p>
            <motion.button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[#06B6D4] text-black hover:bg-[#06B6D4]/85 transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Import from Sheets
            </motion.button>
          </motion.div>
        </div>
        <ImportFromSheetsModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <ModernHeader
        onRefresh={handleRefreshSheets}
        onImport={() => setShowImportModal(true)}
        lastSync={lastSheetsSync}
        searchQuery={headerSearch}
        onSearchChange={setHeaderSearch}
      />
      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto p-8 space-y-6">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-[26px] font-semibold text-white tracking-tight mb-1.5">Dashboard</h1>
          <p className="text-slate-500 text-[14px]">{filteredDashboardTickets.length.toLocaleString()} of {displayTickets.length.toLocaleString()} tickets in the current view.</p>
        </motion.div>

        {sheetAudit?.missingCount > 0 && (
          <motion.div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3.5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-medium text-amber-300">
                  {sheetAudit.missingCount} local ticket belum ada di Google Sheets
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Local: {sheetAudit.localCount} tiket, Google Sheets: {sheetAudit.sheetsCount} tiket.
                </p>
              </div>
            </div>
            <button
              onClick={handleSyncMissingTickets}
              disabled={syncMissingStatus === 'syncing'}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#06B6D4] px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-[#06B6D4]/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              {syncMissingStatus === 'syncing' ? 'Syncing...' : `Sync ${sheetAudit.missingCount} Missing`}
            </button>
          </motion.div>
        )}

        {syncMissingStatus === 'synced' && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-[13px] font-medium text-emerald-300">
            Missing tickets berhasil dikirim ke Google Sheets.
          </div>
        )}

        {syncMissingStatus === 'error' && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[13px] font-medium text-red-300">
            Gagal sync missing tickets. Coba refresh koneksi Google Sheets lalu ulangi.
          </div>
        )}

        {/* Filter controls row */}
        <motion.div
          className="flex flex-col gap-3.5 bg-[#111113] p-4 rounded-lg border border-white/[0.06]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* First sub-row: Time filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mr-1 w-14">Waktu</span>
            <div className="flex flex-wrap items-center gap-1">
              {['all', 'week', 'month', '3months', 'year', 'custom'].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${dateRange === range
                    ? 'bg-[#06B6D4] text-black'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                >
                  {range === 'all' && 'All Time'}
                  {range === 'week' && 'Last Week'}
                  {range === 'month' && 'Last Month'}
                  {range === '3months' && 'Last 3M'}
                  {range === 'year' && 'Last Year'}
                  {range === 'custom' && 'Custom'}
                </button>
              ))}
            </div>

            {dateRange === 'custom' && (
              <div className="flex gap-2 ml-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1 bg-[#0A0A0B] border border-white/10 rounded-md text-white text-[12px] focus:outline-none focus:border-[#06B6D4]/60"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1 bg-[#0A0A0B] border border-white/10 rounded-md text-white text-[12px] focus:outline-none focus:border-[#06B6D4]/60"
                />
              </div>
            )}
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Second sub-row: Type chips & Site Dropdown */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Type chips */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mr-1 w-14">Tipe</span>
              <button
                onClick={() => toggleTypeFilter('all')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${selectedTypes.length === 0
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
              >
                All Types
              </button>
              {['Request Task', 'Problem', 'Troubleshoot', 'Change Request'].map(type => {
                const isSelected = selectedTypes.includes(type)
                return (
                  <button
                    key={type}
                    onClick={() => toggleTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${isSelected
                      ? 'bg-[#06B6D4]/15 text-[#06B6D4]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                      }`}
                  >
                    {type}
                  </button>
                )
              })}
            </div>

            {/* Site Dropdown */}
            <div className="flex items-center gap-2 sm:ml-auto relative">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Site</span>
              <div className="relative">
                <button
                  onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
                  className="px-3 py-1.5 bg-[#0A0A0B] border border-white/10 rounded-md text-[12px] font-medium text-slate-300 hover:border-white/20 flex items-center gap-2 cursor-pointer focus:outline-none focus:border-[#06B6D4]/60 min-w-[150px] justify-between transition-colors"
                >
                  <span>
                    {selectedSites.length === 0
                      ? 'All Sites'
                      : selectedSites.length === 1
                        ? selectedSites[0]
                        : `${selectedSites.length} Sites Selected`}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {siteDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setSiteDropdownOpen(false)} />

                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#161618] border border-white/10 rounded-lg shadow-xl shadow-black/40 p-2.5 z-45 flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder="Search site..."
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-[#0A0A0B] border border-white/10 rounded-md text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#06B6D4]/60"
                        autoFocus
                      />

                      <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                        {allSitesList
                          .filter(s => s.toLowerCase().includes(dropdownSearch.toLowerCase()))
                          .map(site => {
                            const isSelected = selectedSites.includes(site)
                            return (
                              <div
                                key={site}
                                onClick={() => toggleSiteFilter(site)}
                                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-white/[0.06] cursor-pointer transition-colors text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  readOnly
                                  className="rounded border-slate-700 text-[#06B6D4] focus:ring-0 focus:ring-offset-0 pointer-events-none bg-slate-800"
                                />
                                <span className={isSelected ? 'text-[#06B6D4] font-medium' : 'text-slate-300'}>
                                  {site}
                                </span>
                              </div>
                            )
                          })}
                      </div>

                      {selectedSites.length > 0 && (
                        <button
                          onClick={() => {
                            clearSiteFilters()
                            setSiteDropdownOpen(false)
                          }}
                          className="w-full text-center text-[11px] text-[#06B6D4] hover:underline font-medium mt-1 py-1"
                        >
                          Clear Filter
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards - 4 columns on desktop */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            {
              label: 'Total Tickets',
              value: stats.total.toLocaleString(),
              icon: BarChart3,
              trend: 'up',
              trendValue: monthTrendStats.total.label,
              sparklineData: sparklineDataTotal,
              sparklineColor: getTrendColor(sparklineDataTotal, 'total'),
              trendColor: monthTrendStats.total.color
            },
            {
              label: 'Closed Tickets',
              value: stats.closed.toLocaleString(),
              icon: CheckCircle,
              trend: 'up',
              trendValue: monthTrendStats.closed.label,
              sparklineData: sparklineDataClosed,
              sparklineColor: getTrendColor(sparklineDataClosed, 'closed'),
              trendColor: monthTrendStats.closed.color
            },
            {
              label: 'Open Tickets',
              value: stats.open.toLocaleString(),
              icon: AlertCircle,
              trend: 'down',
              trendValue: monthTrendStats.open.label,
              sparklineData: sparklineDataOpen,
              sparklineColor: getTrendColor(sparklineDataOpen, 'open'),
              trendColor: monthTrendStats.open.color
            },
            {
              label: 'Avg Resolution',
              value: formatResolutionTime(stats.avgResolution),
              icon: Clock,
              trend: 'up',
              trendValue: monthTrendStats.resolution.label,
              sparklineData: sparklineDataResolution,
              sparklineColor: getTrendColor(sparklineDataResolution, 'resolution'),
              trendColor: monthTrendStats.resolution.color
            }
          ].map((kpi, idx) => (
            <motion.div
              key={kpi.label}
              className="relative rounded-lg border border-white/[0.07] bg-[#111113] p-5 h-[172px] flex flex-col justify-between hover:border-white/[0.14] transition-colors duration-150"
              variants={itemVariants}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-500 text-[12.5px] font-medium mb-2">{kpi.label}</p>
                  <p className="text-white text-[26px] font-semibold leading-none tabular-nums">{kpi.value}</p>
                </div>
                <div className="w-8 h-8 rounded-md bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                  <kpi.icon className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div className="flex items-end justify-between gap-2 mt-auto">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" style={{ color: kpi.trendColor }} />
                  <span className="text-[12px] font-medium tabular-nums" style={{ color: kpi.trendColor }}>
                    {kpi.trendValue}
                  </span>
                </div>
                <Sparkline data={kpi.sparklineData} color={kpi.sparklineColor} />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Grid - 2 columns */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Tickets by Type Chart */}
          <motion.div className="rounded-lg border border-white/[0.07] bg-[#111113] p-6 flex flex-col justify-between" variants={itemVariants}>
            <h3 className="text-[15px] font-semibold text-white mb-5">Tickets by Type</h3>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Donut Chart Container */}
              <div className="relative w-full sm:w-[50%] h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius="64%"
                      outerRadius="82%"
                      paddingAngle={3}
                      dataKey="value"
                      onMouseEnter={(data, index) => setActiveTypeIndex(index)}
                      onMouseLeave={() => setActiveTypeIndex(null)}
                    >
                      {typeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          style={{
                            outline: 'none',
                            cursor: 'pointer',
                            opacity: activeTypeIndex === null || activeTypeIndex === index ? 1 : 0.35,
                            transition: 'opacity 0.15s ease'
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1A1A1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value) => {
                        const total = stats.total || 1
                        const pct = ((value / total) * 100).toFixed(1)
                        return [`${value} tiket (${pct}%)`, 'Tickets']
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text for total */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-slate-500 text-[10px] font-medium uppercase tracking-wider">Total Tickets</span>
                  <span className="text-white text-2xl font-semibold tabular-nums">{stats.total}</span>
                </div>
              </div>

              {/* Custom Legend Sisi Kanan */}
              <div className="w-full sm:w-[50%] flex flex-col gap-1">
                {typeData.map((item, idx) => (
                  <div
                    key={item.name}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-md transition-colors duration-150 cursor-pointer ${activeTypeIndex === idx ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                      }`}
                    onMouseEnter={() => setActiveTypeIndex(idx)}
                    onMouseLeave={() => setActiveTypeIndex(null)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[13px] font-medium text-slate-300">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium tabular-nums ml-2">
                      {item.percentage}% ({item.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Tickets by Site Chart */}
          <motion.div className="rounded-lg border border-white/[0.07] bg-[#111113] p-6" variants={itemVariants}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <h3 className="text-[15px] font-semibold text-white">Tickets by Site</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search site..."
                  value={siteSearch}
                  onChange={(e) => setSiteSearch(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#0A0A0B] border border-white/10 rounded-md text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#06B6D4]/60"
                />
                <select
                  value={siteLimit === Infinity ? 'all' : siteLimit}
                  onChange={(e) => setSiteLimit(e.target.value === 'all' ? Infinity : Number(e.target.value))}
                  className="bg-[#0A0A0B] border border-white/10 rounded-md px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#06B6D4]/60 cursor-pointer"
                >
                  <option value="5">Top 5</option>
                  <option value="10">Top 10</option>
                  <option value="20">Top 20</option>
                  <option value="all">Show All</option>
                </select>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                layout="vertical"
                data={filteredSiteData}
                margin={{ left: 10, right: 30, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#71717A" style={{ fontSize: '11px' }} />
                <YAxis type="category" dataKey="name" stroke="#71717A" style={{ fontSize: '11px' }} width={120} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: '#1A1A1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => {
                    const total = stats.total || 1
                    const pct = ((value / total) * 100).toFixed(1)
                    return [`${value} tiket (${pct}%)`, 'Tickets']
                  }}
                />
                <Bar dataKey="value" fill="#06B6D4" radius={[0, 3, 3, 0]} maxBarSize={16}>
                  <LabelList dataKey="value" position="right" fill="#A1A1AA" fontSize={11} offset={8} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>

        {/* Latest Tickets Table */}
        <motion.div
          className="rounded-lg border border-white/[0.07] bg-[#111113] p-6"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold text-white">Latest Tickets</h2>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-slate-500 font-medium">Showing {Math.min(5, displayTickets.length)}</span>
              <button
                onClick={() => navigate('/history')}
                className="text-xs font-medium text-[#06B6D4] hover:text-[#06B6D4]/80 flex items-center gap-1 transition-colors"
              >
                View All Tickets →
              </button>
            </div>
          </div>
          <ModernDataTable
            data={latestTickets}
            columns={tableColumns}
            rowsPerPage={5}
          />
        </motion.div>
      </div>

      {/* Import Modal */}
      <ImportFromSheetsModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />
    </div>
  )
}
