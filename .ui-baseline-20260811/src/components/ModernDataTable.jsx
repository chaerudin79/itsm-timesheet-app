import { motion } from 'framer-motion'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useMemo } from 'react'
import { getTicketTypeBadge } from '../utils/ticketTypes'

const statusConfig = {
  CLOSED: { badge: 'badge-success', label: 'Closed' },
  OPEN: { badge: 'badge-danger', label: 'Open' },
}

// Generate compact page list: < 1 2 3 ... 39 40 >
const getPageNumbers = (current, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages = []
  pages.push(1)
  
  if (current > 3) {
    pages.push('...')
  }
  
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  if (current < total - 2) {
    pages.push('...')
  }
  
  pages.push(total)
  return pages
}

export default function ModernDataTable({
  data,
  columns,
  rowsPerPage = 10,
  onRowClick = null
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [localRowsPerPage, setLocalRowsPerPage] = useState(rowsPerPage)
  const [jumpValue, setJumpValue] = useState('')

  // Filter data
  const filteredData = useMemo(() => {
    if (!searchQuery) return data
    return data.filter(row =>
      Object.values(row).some(val =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
  }, [data, searchQuery])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData
    const sorted = [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [filteredData, sortConfig])

  // Paginate
  const totalPages = Math.ceil(sortedData.length / localRowsPerPage) || 1
  const startIdx = (currentPage - 1) * localRowsPerPage
  const paginatedData = sortedData.slice(startIdx, startIdx + localRowsPerPage)

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const renderCell = (value, columnKey) => {
    if (columnKey === 'status') {
      const config = statusConfig[value] || statusConfig.OPEN
      return <span className={`badge ${config.badge}`}>{config.label}</span>
    }
    if (columnKey === 'type') {
      return <span className={`badge ${getTicketTypeBadge(value)}`}>{value || 'Unknown'}</span>
    }
    return <span>{value}</span>
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Table */}
      <div className="table-container">
        <table className="table-base">
          <thead className="table-header">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="table-th">
                  <button
                    onClick={() => handleSort(col.key)}
                    className="flex items-center gap-2 hover:text-slate-200 transition-colors focus:outline-none"
                  >
                    {col.label}
                    <div className="flex flex-col opacity-50 hover:opacity-100">
                      <ChevronUp className="w-3 h-3 -mb-1" />
                      <ChevronDown className="w-3 h-3" />
                    </div>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-td text-center py-8">
                  <div className="empty-state">
                    <p className="empty-state-description">No tickets found</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  className={`table-row cursor-pointer ${idx % 2 === 0 ? 'bg-white/[0.01]' : ''} hover:bg-white/[0.03] transition-colors duration-150`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map(col => (
                    <td key={col.key} className="table-td">
                      {renderCell(row[col.key], col.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination sticky footer */}
      {totalPages > 1 && (
        <div className="sticky bottom-0 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-10 rounded-b-[10px] shadow-lg">
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <div>
              Showing {startIdx + 1} to {Math.min(startIdx + localRowsPerPage, sortedData.length)} of {sortedData.length} tickets
            </div>
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={localRowsPerPage}
                onChange={(e) => {
                  setLocalRowsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[8px] px-2.5 py-1 text-white text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
              >
                {[10, 25, 50, 100].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-[8px] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:border-white/20 text-slate-400 hover:text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers(currentPage, totalPages).map((p, idx) => (
                  p === '...' ? (
                    <span key={`dots-${idx}`} className="px-2 text-slate-500 text-xs">...</span>
                  ) : (
                    <button
                      key={`page-${p}`}
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 rounded-[8px] font-medium text-xs transition-colors ${currentPage === p
                        ? 'bg-[var(--accent)] text-black'
                        : 'bg-[var(--bg-surface-raised)] text-slate-400 border border-[var(--border-subtle)] hover:border-white/20'
                      }`}
                    >
                      {p}
                    </button>
                  )
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-[8px] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:border-white/20 text-slate-400 hover:text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Go to</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const pageNum = parseInt(jumpValue)
                    if (pageNum >= 1 && pageNum <= totalPages) {
                      setCurrentPage(pageNum)
                      setJumpValue('')
                    }
                  }
                }}
                className="w-12 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-[8px] px-2 py-1 text-white text-xs focus:outline-none focus:border-[var(--accent)] text-center"
              />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
