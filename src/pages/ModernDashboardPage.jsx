import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSheetsData } from '../context/SheetsDataProvider'
import { getSummaryStats, groupByDate, groupByMonth } from '../utils/ticketUtils'
import { formatResolutionTime, parseResponseTime } from '../utils/dateUtils'
import ModernHeader from '../components/ModernHeader'
import ModernDataTable from '../components/ModernDataTable'
import ImportFromSheetsModal from '../components/ImportFromSheetsModal'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList, LineChart, Line } from 'recharts'

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
    return { start, end, previousStart: addDays(start, -7), previousEnd: start, label: 'vs previous period' }
  }

  if (dateRange === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start, end, previousStart: addMonths(start, -1), previousEnd: start, label: 'vs previous period' }
  }

  if (dateRange === '3months') {
    const start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start, end, previousStart: addMonths(start, -3), previousEnd: start, label: 'vs previous period' }
  }

  if (dateRange === 'year') {
    const start = new Date(now.getFullYear() - 1, 0, 1)
    const end = new Date(now.getFullYear(), 0, 1)
    return { start, end, previousStart: addYears(start, -1), previousEnd: start, label: 'vs previous period' }
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
  return { start, end, previousStart: addMonths(start, -1), previousEnd: start, label: 'vs previous period' }
}

function isWithinRange(ticket, range) {
  const date = new Date(ticket.date || ticket.taskStarted || 0)
  return !isNaN(date) && date >= range.start && date < range.end
}

const KPI_COLOR_CONFIG = {
  total: { invertColorLogic: false, neutralOnDecrease: true },
  open: { invertColorLogic: true },
  closed: { invertColorLogic: false },
  resolution: { invertColorLogic: true },
  response: { invertColorLogic: true },
}

function formatTrend(current, previous, trendLabel, lowerIsBetter = false, metricKey = null) {
  // Guard when previous is missing or zero
  if (previous === 0 || previous == null) {
    if (!current || current === 0) {
      return { label: '—', context: 'No previous period', color: '#727C88', valid: false, direction: 0 }
    }
    // previous 0 but current > 0: treat as new
    const config = KPI_COLOR_CONFIG[metricKey] || {}
    const improved = lowerIsBetter ? false : true
    const color = config.neutralOnDecrease ? '#727C88' : (improved ? '#22C55E' : '#EF4444')
    return { label: 'New', context: trendLabel, color, valid: true, direction: 1 }
  }

  const change = ((current - previous) / previous) * 100
  const rounded = Math.round(change)
  const sign = rounded > 0 ? '+' : ''

  const config = KPI_COLOR_CONFIG[metricKey] || {}
  const effectiveLowerIsBetter = (config.invertColorLogic === true) || lowerIsBetter
  const improved = effectiveLowerIsBetter ? change <= 0 : change >= 0

  const color = (() => {
    if (config.neutralOnDecrease && change < 0) return '#727C88'
    return improved ? '#22C55E' : '#EF4444'
  })()

  const direction = rounded === 0 ? 0 : (rounded > 0 ? 1 : -1)

  return {
    label: `${sign}${rounded}%`,
    context: trendLabel,
    color,
    valid: true,
    direction,
  }
}

function TicketActivityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const formattedDate = new Date(label).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-surface px-3 py-2 text-[12px] shadow-lg text-slate-900 dark:text-brand-text">
      <p className="text-slate-500 dark:text-brand-text-secondary">{formattedDate}</p>
      {payload.map(({ dataKey, value, color }) => (
        <p key={dataKey} className="mt-0.5 font-medium tabular-nums" style={{ color }}>
          {dataKey === 'opened' ? 'Tickets Opened' : 'Tickets Closed'}: {value}
        </p>
      ))}
    </div>
  )
}

function Sparkline({ data, color, valueFormatter }) {
  const [hoveredPoint, setHoveredPoint] = useState(null)

  if (!data || data.length < 2) {
    return <div className="w-[140px] h-[35px]" />
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
    <div className="w-[140px] h-[35px] relative">
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
            className="fill-white dark:fill-brand-surface stroke-current cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
            style={{ color: color }}
            onMouseEnter={() => setHoveredPoint(p)}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        ))}
      </svg>
      {hoveredPoint && (
        <div className="absolute bottom-full right-0 mb-1.5 bg-slate-900 dark:bg-brand-surface border border-slate-700 dark:border-slate-700 text-[9px] text-white px-2 py-0.5 rounded whitespace-nowrap z-25 pointer-events-none shadow-md">
          {hoveredPoint.date}: {valueFormatter ? valueFormatter(hoveredPoint.value) : hoveredPoint.value.toFixed ? hoveredPoint.value.toFixed(0) : String(hoveredPoint.value)}
        </div>
      )}
    </div>
  )
}

export default function ModernDashboard() {
  const navigate = useNavigate()
  const { darkMode } = useAuth()
  const { tickets, lastSync: lastSheetsSync, refresh } = useSheetsData()
  const [showImportModal, setShowImportModal] = useState(false)
  const displayTickets = useMemo(() => tickets.filter(t => !t.requesterIsRawNpp && !/^\d{5,6}$/.test(t.requester)), [tickets])
  const [isRefreshing, setIsRefreshing] = useState(false)
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

  // Refresh data from Sheets
  const handleRefreshSheets = async () => {
    setIsRefreshing(true)
    try {
      await refresh()
    } catch (err) {
      console.error('Refresh failed:', err)
    } finally {
      setIsRefreshing(false)
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
  const avgResponseTime = useMemo(() => {
    const responseTimes = filteredDashboardTickets.filter(ticket => ticket.firstResponseTime).map(ticket => parseResponseTime(ticket.firstResponseTime)).filter(Boolean)
    return responseTimes.length ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length : 0
  }, [filteredDashboardTickets])
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
      total: formatTrend(currentStats.total, previousStats.total, trendRange.label, false, 'total'),
      closed: formatTrend(currentStats.closed, previousStats.closed, trendRange.label, false, 'closed'),
      open: formatTrend(currentStats.open, previousStats.open, trendRange.label, true, 'open'),
      resolution: formatTrend(currentStats.avgResolution, previousStats.avgResolution, trendRange.label, true, 'resolution'),
    }
  }, [displayTickets, selectedTypes, selectedSites, dateRange, customStartDate, customEndDate])

  // Response time trend: compute separately so we can treat 'all' range specially
  const responseTrend = useMemo(() => {
    const trendRange = getDashboardRange(dateRange, customStartDate, customEndDate)
    const currentRange = { start: trendRange.start, end: trendRange.end }
    const previousRange = { start: trendRange.previousStart, end: trendRange.previousEnd }

    let baseTickets = displayTickets
    if (selectedTypes.length > 0) baseTickets = baseTickets.filter(t => selectedTypes.includes(t.type))
    if (selectedSites.length > 0) baseTickets = baseTickets.filter(t => selectedSites.includes(t.requester))

    // Helper to compute avg response seconds for a set
    const avgResp = (tickets) => {
      const vals = tickets.filter(t => t.firstResponseTime).map(t => parseResponseTime(t.firstResponseTime)).filter(Boolean)
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
    }

    // If user selected All Time, don't show previous period comparison — show context instead
    if (dateRange === 'all') {
      return { valid: false, label: '—', context: 'vs all-time average', color: '#727C88' }
    }

    const currentAvg = avgResp(baseTickets.filter(ticket => isWithinRange(ticket, currentRange)))
    const previousAvg = avgResp(baseTickets.filter(ticket => isWithinRange(ticket, previousRange)))

    return formatTrend(currentAvg, previousAvg, trendRange.label, true, 'response')
  }, [displayTickets, selectedTypes, selectedSites, dateRange, customStartDate, customEndDate])
  const dailyData = useMemo(() => {
    const dailyTickets = groupByDate(filteredDashboardTickets)
    return dailyTickets.map(({ date, count }) => ({
      date,
      opened: count,
      closed: filteredDashboardTickets.filter(ticket => ticket.date === date && ticket.status === 'CLOSED').length,
    }))
  }, [filteredDashboardTickets])
  const monthlyData = useMemo(() => groupByMonth(filteredDashboardTickets), [filteredDashboardTickets])

  const typeColorMap = useMemo(() => ({
    'Problem': '#D97757',
    'Service Request': '#4EA8A5',
    'Change Request': '#C5944C',
    'Incident': '#8583B6'
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
      } else if (type === 'response') {
        const valid = dayTickets.filter(t => t.firstResponseTime)
        if (valid.length > 0) {
          const totalSecs = valid.reduce((sum, t) => {
            return sum + (parseResponseTime(t.firstResponseTime) || 0)
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
  const sparklineDataResponse = useMemo(() => getSparklineData(filteredDashboardTickets, 'response'), [filteredDashboardTickets, getSparklineData])

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
    return lastVal <= firstVal ? '#22C55E' : '#727C88'
  }, [])

  const SLA_TARGET_SECONDS = 300 // 5 minutes
  const slaPercent = useMemo(() => {
    const vals = filteredDashboardTickets.filter(t => t.firstResponseTime).map(t => parseResponseTime(t.firstResponseTime)).filter(Boolean)
    if (vals.length === 0) return 0
    const within = vals.filter(v => v <= SLA_TARGET_SECONDS).length
    return Math.round((within / vals.length) * 100)
  }, [filteredDashboardTickets])

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
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F8FAFC] dark:bg-brand-bg min-h-screen text-slate-900 dark:text-brand-text transition-colors duration-150">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            <div className="w-12 h-12 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center mx-auto mb-5 shadow-sm dark:shadow-none">
              <BarChart3 className="w-6 h-6 text-slate-400 dark:text-brand-text-secondary" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-brand-text mb-1.5">No Tickets Yet</h2>
            <p className="text-slate-500 dark:text-brand-text-secondary text-sm mb-6 max-w-md">
              Start by creating a new timesheet or importing tickets from Google Sheets
            </p>
            <motion.button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-brand-primary text-white hover:bg-[#0891B2] transition-colors"
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-brand-bg text-slate-900 dark:text-brand-text transition-colors duration-150">
      <ModernHeader
        onRefresh={handleRefreshSheets}
        onImport={() => setShowImportModal(true)}
        lastSync={lastSheetsSync}
        searchQuery={headerSearch}
        onSearchChange={setHeaderSearch}
      />
      {/* Main Content */}
      <div className="max-w-[1440px] w-full mx-auto p-6 lg:p-8 space-y-6">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-[28px] font-semibold text-slate-900 dark:text-brand-text tracking-tight mb-1">ITSM NAC Operations Dashboard</h1>
          <p className="text-slate-500 dark:text-brand-text-secondary text-[13px]">{stats.open.toLocaleString()} Open Tickets require attention &bull; {dateRange === 'all' ? 'All time' : dateRange === '3months' ? 'Last 3 months' : dateRange === 'week' ? 'Last week' : dateRange === 'month' ? 'Last month' : dateRange === 'year' ? 'Last year' : 'Custom period'}</p>
        </motion.div>

        {/* Filter controls row */}
        <motion.div
          className="relative z-40 flex flex-col gap-3.5 py-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* First sub-row: Time filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500 dark:text-brand-text-secondary uppercase tracking-wide mr-1 w-24">Time Range</span>
            <div className="flex flex-wrap items-center gap-1">
              {['all', 'week', 'month', '3months', 'year', 'custom'].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${dateRange === range
                    ? 'bg-brand-primary text-white font-medium'
                    : 'text-slate-600 dark:text-brand-text-secondary hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06]'
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
                  className="px-2.5 py-1 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white text-[12px] focus:outline-none focus:border-brand-primary"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white text-[12px] focus:outline-none focus:border-brand-primary"
                />
              </div>
            )}
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800" />

          {/* Second sub-row: Type chips & Site Dropdown */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Type chips */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] font-medium text-slate-500 dark:text-brand-text-secondary uppercase tracking-wide mr-1 w-24">Ticket Type</span>
              <button
                onClick={() => toggleTypeFilter('all')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${selectedTypes.length === 0
                  ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-brand-text-secondary hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06]'
                  }`}
              >
                All Types
              </button>
              {['Service Request', 'Problem', 'Incident', 'Change Request'].map(type => {
                const isSelected = selectedTypes.includes(type)
                return (
                  <button
                    key={type}
                    onClick={() => toggleTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${isSelected
                      ? 'bg-brand-primary/15 text-brand-primary border border-brand-primary/30'
                      : 'text-slate-600 dark:text-brand-text-secondary hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06]'
                      }`}
                  >
                    {type}
                  </button>
                )
              })}
            </div>

            {/* Site Dropdown */}
            <div className="relative z-50 flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500 dark:text-brand-text-secondary uppercase tracking-wide">Site</span>
              <div className="relative z-50">
                <button
                  onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
                  className="px-3 py-1.5 bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-md text-[12px] font-medium text-slate-700 dark:text-brand-text-secondary hover:border-slate-300 dark:hover:border-slate-700 flex items-center gap-2 cursor-pointer focus:outline-none focus:border-brand-primary min-w-[150px] justify-between transition-colors shadow-sm dark:shadow-none"
                >
                  <span>
                    {selectedSites.length === 0
                      ? 'All Sites'
                      : selectedSites.length === 1
                        ? selectedSites[0]
                        : `${selectedSites.length} Sites Selected`}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                </button>

                {siteDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setSiteDropdownOpen(false)} />

                    <div className="absolute right-0 top-full z-[60] mt-1.5 flex w-64 flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-surface p-2.5 shadow-xl">
                      <input
                        type="text"
                        placeholder="Search site..."
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-brand-bg border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-primary"
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
                                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  readOnly
                                  className="rounded border-slate-300 dark:border-slate-700 text-brand-primary focus:ring-0 focus:ring-offset-0 pointer-events-none bg-white dark:bg-slate-800"
                                />
                                <span className={isSelected ? 'text-brand-primary font-medium' : 'text-slate-700 dark:text-slate-300'}>
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
                          className="w-full text-center text-[11px] text-brand-primary hover:underline font-medium mt-1 py-1"
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
          className="relative z-0 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            {
              label: 'Avg Response Time',
              value: formatResolutionTime(avgResponseTime),
              context: 'Time to first reply',
              comparison: { ...responseTrend, color: responseTrend.color },
              icon: Clock,
              trend: responseTrend.direction >= 0 ? 'up' : 'down',
              trendValue: responseTrend.label,
              sparklineData: sparklineDataResponse,
              sparklineColor: responseTrend.color || '#727C88',
              trendColor: responseTrend.color || '#727C88',
              sla: { targetSeconds: SLA_TARGET_SECONDS, percent: slaPercent }
            },
            {
              label: 'Total Tickets',
              value: stats.total.toLocaleString(),
              context: 'All tickets',
              comparison: { ...monthTrendStats.total, color: monthTrendStats.total.color },
              icon: BarChart3,
              trend: 'up',
              trendValue: monthTrendStats.total.label,
              sparklineData: sparklineDataTotal,
              sparklineColor: monthTrendStats.total.color,
              trendColor: monthTrendStats.total.color,
              iconColor: 'text-emerald-500 dark:text-emerald-400'
            },
            {
              label: 'Closed Tickets',
              value: stats.closed.toLocaleString(),
              context: stats.total ? `${Math.round((stats.closed / stats.total) * 100)}% closure rate` : 'No tickets in view',
              comparison: monthTrendStats.closed,
              icon: CheckCircle,
              trend: 'up',
              trendValue: monthTrendStats.closed.label,
              sparklineData: sparklineDataClosed,
              sparklineColor: monthTrendStats.closed.color,
              trendColor: monthTrendStats.closed.color
            },
            {
              label: 'Open Tickets',
              value: stats.open.toLocaleString(),
              context: stats.open ? 'Needs attention' : 'No active tickets',
              comparison: monthTrendStats.open,
              icon: AlertCircle,
              trend: 'down',
              trendValue: monthTrendStats.open.label,
              sparklineData: sparklineDataOpen,
              sparklineColor: monthTrendStats.open.color,
              trendColor: monthTrendStats.open.color,
              iconColor: stats.open > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-500 dark:text-emerald-400',
              cardClass: stats.open > 0 ? 'border-amber-300 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/[0.06]' : ''
            },
            {
              label: 'Avg Resolution Time',
              value: formatResolutionTime(stats.avgResolution),
              context: 'Average handling time',
              comparison: monthTrendStats.resolution,
              icon: Clock,
              trend: 'up',
              trendValue: monthTrendStats.resolution.label,
              sparklineData: sparklineDataResolution,
              sparklineColor: monthTrendStats.resolution.color,
              trendColor: monthTrendStats.resolution.color
            }
          ].sort((a, b) => ['Total Tickets', 'Open Tickets', 'Closed Tickets', 'Avg Response Time', 'Avg Resolution Time'].indexOf(a.label) - ['Total Tickets', 'Open Tickets', 'Closed Tickets', 'Avg Response Time', 'Avg Resolution Time'].indexOf(b.label)).map((kpi, idx) => (
            <motion.div
              key={kpi.label}
              className={`relative z-0 rounded-[10px] bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 p-5 h-[184px] flex flex-col transition-colors duration-150 shadow-sm dark:shadow-none ${idx === 0 ? 'bg-slate-50/60 dark:bg-brand-surface' : ''} ${kpi.cardClass || ''}`}
              variants={itemVariants}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-500 dark:text-brand-text-secondary text-[12.5px] font-medium mb-2">{kpi.label}</p>
                  <p className="text-slate-900 dark:text-brand-text text-[28px] font-semibold leading-none tabular-nums">{kpi.value}</p>
                  {kpi.sla && (
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-brand-text-secondary">SLA: {kpi.sla.percent}% within {formatResolutionTime(kpi.sla.targetSeconds)}</p>
                  )}
                  <p className="mt-3 text-[11px] text-slate-500 dark:text-brand-text-secondary no-underline">{kpi.context}</p>
                </div>
                <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 flex items-center justify-center flex-shrink-0">
                  <kpi.icon className={`w-4 h-4 ${kpi.iconColor || 'text-slate-500 dark:text-brand-text-secondary'}`} />
                </div>
              </div>
              {kpi.comparison && kpi.comparison.valid ? (
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
                  <div className="min-w-0 pb-0.5">
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 leading-tight">
                      {kpi.comparison.direction && kpi.comparison.direction < 0 ? <TrendingDown className="w-3 h-3 flex-shrink-0" style={{ color: kpi.comparison.color }} /> : <TrendingUp className="w-3 h-3 flex-shrink-0" style={{ color: kpi.comparison.color }} />}
                      <span className="text-[11px] font-medium tabular-nums" style={{ color: kpi.comparison.color }}>{kpi.comparison.label}</span>
                      <span className="text-[11px] text-slate-500 dark:text-brand-text-secondary no-underline">{kpi.comparison.context}</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <Sparkline data={kpi.sparklineData} color={kpi.sparklineColor} valueFormatter={kpi.label === 'Avg Response Time' ? (v => formatResolutionTime(v)) : undefined} />
                  </div>
                </div>
              ) : (
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
                  <div />
                  <div className="flex-shrink-0">
                    <Sparkline data={kpi.sparklineData} color={kpi.sparklineColor} />
                  </div>
                </div>
              )}

            </motion.div>
          ))}
        </motion.div>

        <motion.section
          className="relative z-0 rounded-[10px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-surface p-5 lg:p-6 shadow-sm dark:shadow-none transition-colors duration-150"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          aria-label="Ticket activity over time"
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-[16px] font-semibold text-slate-900 dark:text-brand-text">Ticket Activity</h2>
              <p className="text-[12px] text-slate-500 dark:text-brand-text-secondary mt-1">Daily comparison of tickets opened and closed</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-brand-text-secondary"><i className="h-2 w-2 rounded-full bg-[#06B6D4]" />Tickets Opened</span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-brand-text-secondary"><i className="h-2 w-2 rounded-full bg-[#A78BFA]" />Tickets Closed</span>
            </div>
          </div>
          <div className="h-[220px]" role="img" aria-label={`${stats.total} tickets across ${dailyData.length} active days, showing opened and closed tickets`}>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={darkMode ? '#1F2937' : '#E2E8F0'} strokeOpacity={0.7} vertical={false} strokeDasharray="3 4" />
                  <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} stroke={darkMode ? '#94A3B8' : '#64748B'} tickLine={false} axisLine={false} fontSize={11} minTickGap={30} />
                  <YAxis allowDecimals={false} stroke={darkMode ? '#94A3B8' : '#64748B'} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip content={<TicketActivityTooltip />} cursor={{ stroke: '#06B6D4', strokeOpacity: 0.16 }} />
                  <Line type="monotone" name="Tickets Opened" dataKey="opened" stroke="#06B6D4" strokeOpacity={0.9} strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#06B6D4', stroke: darkMode ? '#111827' : '#FFFFFF', strokeWidth: 2 }} />
                  <Line type="monotone" name="Tickets Closed" dataKey="closed" stroke="#A78BFA" strokeOpacity={0.9} strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#A78BFA', stroke: darkMode ? '#111827' : '#FFFFFF', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[13px] text-slate-500 dark:text-brand-text-secondary">No ticket activity for the selected filters.</div>
            )}
          </div>
        </motion.section>

        {/* Charts Grid - 2 columns */}
        <motion.div
          className="grid grid-cols-1 xl:grid-cols-12 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Tickets by Type Chart */}
          <motion.div className="xl:col-span-5 rounded-[10px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-surface p-5 lg:p-6 flex flex-col justify-between shadow-sm dark:shadow-none transition-colors duration-150" variants={itemVariants}>
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-brand-text mb-5">Tickets by Type</h3>
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
                      contentStyle={{
                        backgroundColor: darkMode ? '#111827' : '#FFFFFF',
                        border: darkMode ? '1px solid #1F2937' : '1px solid #E2E8F0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: darkMode ? '#FFFFFF' : '#0F172A',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      labelStyle={{ color: darkMode ? '#FFFFFF' : '#0F172A' }}
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
                  <span className="text-slate-500 dark:text-brand-text-secondary text-[10px] font-medium uppercase tracking-wider">Total Tickets</span>
                  <span className="text-slate-900 dark:text-brand-text text-2xl font-semibold tabular-nums">{stats.total}</span>
                </div>
              </div>

              {/* Custom Legend Sisi Kanan */}
              <div className="w-full sm:w-[50%] flex flex-col gap-1">
                {typeData.map((item, idx) => (
                  <div
                    key={item.name}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-md transition-colors duration-150 cursor-pointer ${activeTypeIndex === idx
                      ? 'bg-slate-100 dark:bg-white/[0.06]'
                      : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}
                    onMouseEnter={() => setActiveTypeIndex(idx)}
                    onMouseLeave={() => setActiveTypeIndex(null)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-brand-text-secondary font-medium tabular-nums ml-2">
                      {item.percentage}% ({item.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Tickets by Site Chart */}
          <motion.div className="xl:col-span-7 rounded-[10px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-surface p-5 lg:p-6 shadow-sm dark:shadow-none transition-colors duration-150" variants={itemVariants}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <h3 className="text-[15px] font-semibold text-slate-900 dark:text-brand-text">Tickets by Site</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search site..."
                  value={siteSearch}
                  onChange={(e) => setSiteSearch(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-brand-bg border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-primary"
                />
                <select
                  value={siteLimit === Infinity ? 'all' : siteLimit}
                  onChange={(e) => setSiteLimit(e.target.value === 'all' ? Infinity : Number(e.target.value))}
                  className="bg-white dark:bg-brand-bg border border-slate-200 dark:border-slate-800 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-brand-primary cursor-pointer"
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
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#1F2937' : '#E2E8F0'} horizontal={false} />
                <XAxis type="number" stroke={darkMode ? '#94A3B8' : '#64748B'} style={{ fontSize: '11px' }} />
                <YAxis type="category" dataKey="name" stroke={darkMode ? '#94A3B8' : '#64748B'} style={{ fontSize: '11px' }} width={120} />
                <Tooltip
                  cursor={{ fill: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                  contentStyle={{
                    backgroundColor: darkMode ? '#111827' : '#FFFFFF',
                    border: darkMode ? '1px solid #1F2937' : '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: darkMode ? '#FFFFFF' : '#0F172A',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  labelStyle={{ color: darkMode ? '#FFFFFF' : '#0F172A' }}
                  formatter={(value) => {
                    const total = stats.total || 1
                    const pct = ((value / total) * 100).toFixed(1)
                    return [`${value} tiket (${pct}%)`, 'Tickets']
                  }}
                />
                <Bar dataKey="value" fill="#06B6D4" radius={[0, 3, 3, 0]} maxBarSize={16}>
                  <LabelList dataKey="value" position="right" fill={darkMode ? '#94A3B8' : '#64748B'} fontSize={11} offset={8} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>

        {/* Latest Tickets Table */}
        <motion.div
          className="rounded-[10px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-surface p-5 lg:p-6 shadow-sm dark:shadow-none transition-colors duration-150"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-brand-text">Latest Tickets</h2>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-slate-500 dark:text-brand-text-secondary font-medium">Showing {latestTickets.length}</span>
              <button
                onClick={() => navigate('/history')}
                className="text-xs font-medium text-brand-primary hover:text-brand-primary/80 flex items-center gap-1 transition-colors"
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
