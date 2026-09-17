import { Fragment, useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Edit2, Check, X, ChevronDown, ChevronRight, ThumbsUp, AlertTriangle } from 'lucide-react'
import { TICKET_TYPES, getTicketTypeBadge } from '../utils/ticketTypes'

// Confidence detection
const getConfidenceStatus = (ticket) => {
  if (!ticket.problem?.trim() || !ticket.action?.trim()) {
    return 'FAILED'
  }

  const validRequesters = [
    'Anugra - BNI',
    'Helpdesk Desktop',
    'ITSM Backbone SDD',
    'NPS - ITSM Network Security',
    'Tegar - BNI',
    'Tommy - CISO BNI',
    'User - BNI',
    'User - BNI Sarinah',
    'User - BNU Slipi',
    'User - Menara BNI',
    'User - Plaza BNI BSD',
    'User - BNI Citicon',
    'User - Grha BNI',
    'User - BNI RDTX'
  ]
  const validTypes = TICKET_TYPES

  const hasValidRequester = validRequesters.includes(ticket.requester)
  const hasValidType = validTypes.includes(ticket.type)
  const hasValidDate = ticket.date && ticket.date !== '-' && !ticket.date.includes('unknown')

  if (!hasValidRequester || !hasValidType || !hasValidDate) {
    return 'REVIEW'
  }

  return 'HIGH'
}

export default function TicketTable({ tickets, onUpdateTickets, onApproveTickets }) {
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [searchText, setSearchText] = useState('')
  const searchTimeoutRef = useRef(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedNos, setSelectedNos] = useState([])
  const [expandedNos, setExpandedNos] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Debounce search input (300ms)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchText])

  // Filter based on search text
  const filteredTickets = useMemo(() => {
    return tickets.filter(t =>
      t.problem?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      t.requester?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      t.engineer?.toLowerCase().includes(debouncedSearch.toLowerCase())
    )
  }, [tickets, debouncedSearch])

  // Group & Sort: Put unapproved FAILED/REVIEW first, then unapproved HIGH, then approved at the bottom
  const sortedTickets = useMemo(() => {
    const score = { FAILED: 3, REVIEW: 2, HIGH: 1 }
    return [...filteredTickets].sort((a, b) => {
      const appA = a.approved === true ? 1 : 0
      const appB = b.approved === true ? 1 : 0
      if (appA !== appB) return appA - appB

      const confA = getConfidenceStatus(a)
      const confB = getConfidenceStatus(b)
      const scoreA = score[confA] || 1
      const scoreB = score[confB] || 1
      if (scoreA !== scoreB) return scoreB - scoreA

      return (a.no || 0) - (b.no || 0)
    })
  }, [filteredTickets])
  const totalPages = Math.max(1, Math.ceil(sortedTickets.length / rowsPerPage))
  const pageStart = (currentPage - 1) * rowsPerPage
  const visibleTickets = useMemo(() => {
    return sortedTickets.slice(pageStart, pageStart + rowsPerPage)
  }, [sortedTickets, pageStart, rowsPerPage])

  // Get unapproved list for selection
  const unapprovedTickets = useMemo(() => {
    return tickets.filter(t => t.approved !== true)
  }, [tickets])
  const ticketIndexByNo = useMemo(() => {
    const index = new Map()
    tickets.forEach((ticket, idx) => index.set(ticket.no, idx))
    return index
  }, [tickets])
  const selectedNoSet = useMemo(() => new Set(selectedNos), [selectedNos])
  const expandedNoSet = useMemo(() => new Set(expandedNos), [expandedNos])
  const approvedCount = useMemo(() => {
    return tickets.filter(t => t.approved === true).length
  }, [tickets])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, rowsPerPage])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const handleCellClick = (ticketIdx, fieldName, value) => {
    setEditingCell({ ticketIdx, fieldName })
    setEditValue(value || '')
  }

  const handleSaveCell = useCallback((ticketIdx, fieldName) => {
    if (!editValue || editValue.trim() === '') {
      alert('Field cannot be empty. Please enter a value.')
      return
    }

    const updated = [...tickets]
    updated[ticketIdx][fieldName] = editValue.trim()

    // Recalculate confidence / clean up
    onUpdateTickets(updated)
    setEditingCell(null)
  }, [tickets, editValue, onUpdateTickets])

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedNos(unapprovedTickets.map(t => t.no))
    } else {
      setSelectedNos([])
    }
  }

  const handleSelectRow = (ticketNo) => {
    setSelectedNos(prev =>
      prev.includes(ticketNo)
        ? prev.filter(no => no !== ticketNo)
        : [...prev, ticketNo]
    )
  }

  const toggleExpand = (ticketNo) => {
    setExpandedNos(prev =>
      prev.includes(ticketNo)
        ? prev.filter(no => no !== ticketNo)
        : [...prev, ticketNo]
    )
  }

  const handleApproveSelected = () => {
    if (selectedNos.length === 0) return
    const selectedSet = new Set(selectedNos)
    const toApprove = tickets.filter(t => selectedSet.has(t.no))
    onApproveTickets?.(toApprove)
    setSelectedNos([])
  }

  const handleApproveAll = () => {
    const toApprove = tickets.filter(t => t.approved !== true)
    if (toApprove.length === 0) return
    onApproveTickets?.(toApprove)
    setSelectedNos([])
  }

  const getStatusBadgeColor = (status) => {
    return status === 'CLOSED' ? 'badge-closed' : 'badge-open'
  }

  return (
    <div className="w-full space-y-4">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800/50">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Status Peninjauan: <span className="text-brand-primary">{approvedCount}</span> dari <span className="text-slate-900 dark:text-white">{tickets.length}</span> tiket disetujui
        </div>

        {unapprovedTickets.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleApproveSelected}
              disabled={selectedNos.length === 0}
              className="px-3.5 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/30 disabled:opacity-40 text-brand-primary rounded-lg border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:cursor-not-allowed"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              Approve Selected ({selectedNos.length})
            </button>
            <button
              onClick={handleApproveAll}
              className="px-3.5 py-1.5 bg-brand-primary hover:bg-cyan-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              Approve All
            </button>
          </div>
        )}
      </div>

      <div className="mb-3">
        <input
          type="text"
          placeholder="Cari berdasarkan problem, requester, engineer..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-primary text-sm"
        />
      </div>

      {tickets.length > 0 && (
        <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Menampilkan {sortedTickets.length === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + rowsPerPage, sortedTickets.length)} dari {filteredTickets.length} hasil ({tickets.length} tiket)
          </span>
          <div className="flex items-center gap-2">
            <span>Rows</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-primary"
            >
              {[25, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40"
            >
              Prev
            </button>
            <span>{currentPage}/{totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="tickets-table min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead>
            <tr>
              <th className="w-8"></th>
              <th className="w-8">
                {unapprovedTickets.length > 0 && (
                  <input
                    type="checkbox"
                    checked={selectedNos.length === unapprovedTickets.length && unapprovedTickets.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 dark:border-slate-700 text-brand-primary focus:ring-0 bg-white dark:bg-slate-900"
                  />
                )}
              </th>
              <th>No</th>
              <th>Confidence</th>
              <th>Source</th>
              <th>Type</th>
              <th>Requester</th>
              <th>Period</th>
              <th>Year</th>
              <th>Problem/Issue</th>
              <th>Action</th>
              <th>Date</th>
              <th>Task Started</th>
              <th>Task Finished</th>
              <th>Resolution Time</th>
              <th>Status</th>
              <th>Engineer</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
            {sortedTickets.length === 0 ? (
              <tr>
                <td colSpan="18" className="text-center py-8 text-slate-500 dark:text-slate-400">
                  {tickets.length === 0 ? 'Belum ada tiket' : 'Hasil pencarian kosong'}
                </td>
              </tr>
            ) : (
              visibleTickets.map((ticket, idx) => {
                const actualIdx = ticketIndexByNo.get(ticket.no) ?? idx
                const conf = getConfidenceStatus(ticket)
                const isExpanded = expandedNoSet.has(ticket.no)
                const isApproved = ticket.approved === true

                // Set left border and bg depending on confidence & approval
                let rowStyle = 'hover:bg-slate-50 dark:hover:bg-slate-900/10'
                if (!isApproved) {
                  if (conf === 'FAILED') {
                    rowStyle = 'border-l-4 border-rose-500 bg-rose-500/5 hover:bg-rose-500/10'
                  } else if (conf === 'REVIEW') {
                    rowStyle = 'border-l-4 border-amber-500 bg-amber-500/5 hover:bg-amber-500/10'
                  }
                }

                return (
                  <Fragment key={ticket.no || idx}>
                    <tr className={`${rowStyle} ${idx % 2 === 0 ? 'bg-slate-50/50 dark:bg-white/[0.02]' : 'bg-white dark:bg-transparent'} hover:bg-slate-100/70 dark:hover:bg-white/[0.05] transition-colors duration-150`}>
                      <td className="w-8 text-center">
                        <button
                          onClick={() => toggleExpand(ticket.no)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td className="w-8 text-center">
                        {!isApproved && (
                          <input
                            type="checkbox"
                            checked={selectedNoSet.has(ticket.no)}
                            onChange={() => handleSelectRow(ticket.no)}
                            className="rounded border-slate-300 dark:border-slate-700 text-brand-primary focus:ring-0 bg-white dark:bg-slate-900"
                          />
                        )}
                        {isApproved && (
                          <Check size={14} className="text-emerald-400 mx-auto" />
                        )}
                      </td>
                      <td className="font-mono text-xs">{ticket.no}</td>
                      <td>
                        {isApproved ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Approved
                          </span>
                        ) : conf === 'HIGH' ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> High
                          </span>
                        ) : conf === 'REVIEW' ? (
                          <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold animate-pulse">
                            <AlertTriangle size={12} /> Review
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-rose-400 font-semibold">
                            <AlertTriangle size={12} /> Failed
                          </span>
                        )}
                      </td>
                      <td>{ticket.source || 'WhatsApp'}</td>
                      <td>
                        <span className={`badge ${getTicketTypeBadge(ticket.type)} text-[11px] px-2 py-0.5 rounded-full`}>
                          {ticket.type}
                        </span>
                      </td>
                      <td>
                        <Cell
                          value={ticket.requester}
                          isEditing={editingCell?.ticketIdx === actualIdx && editingCell?.fieldName === 'requester'}
                          editValue={editValue}
                          onEdit={() => !isApproved && handleCellClick(actualIdx, 'requester', ticket.requester)}
                          onSave={() => handleSaveCell(actualIdx, 'requester')}
                          onCancel={() => setEditingCell(null)}
                          onChangeEdit={setEditValue}
                          isApproved={isApproved}
                        />
                      </td>
                      <td>{ticket.period || '-'}</td>
                      <td>{ticket.year || '-'}</td>
                      <td>
                        <Cell
                          value={ticket.problem}
                          isEditing={editingCell?.ticketIdx === actualIdx && editingCell?.fieldName === 'problem'}
                          editValue={editValue}
                          onEdit={() => !isApproved && handleCellClick(actualIdx, 'problem', ticket.problem)}
                          onSave={() => handleSaveCell(actualIdx, 'problem')}
                          onCancel={() => setEditingCell(null)}
                          onChangeEdit={setEditValue}
                          maxChars={40}
                          isApproved={isApproved}
                        />
                      </td>
                      <td>
                        <Cell
                          value={ticket.action}
                          isEditing={editingCell?.ticketIdx === actualIdx && editingCell?.fieldName === 'action'}
                          editValue={editValue}
                          onEdit={() => !isApproved && handleCellClick(actualIdx, 'action', ticket.action)}
                          onSave={() => handleSaveCell(actualIdx, 'action')}
                          onCancel={() => setEditingCell(null)}
                          onChangeEdit={setEditValue}
                          maxChars={40}
                          isApproved={isApproved}
                        />
                      </td>
                      <td>{ticket.date || '-'}</td>
                      <td>{ticket.taskStarted || '-'}</td>
                      <td>{ticket.taskFinished || '-'}</td>
                      <td className="font-mono text-[11px] text-slate-400">{ticket.resolutionTime || '-'}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeColor(ticket.status)} text-[11px] px-2 py-0.5 rounded-full`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td>
                        <Cell
                          value={ticket.engineer}
                          isEditing={editingCell?.ticketIdx === actualIdx && editingCell?.fieldName === 'engineer'}
                          editValue={editValue}
                          onEdit={() => !isApproved && handleCellClick(actualIdx, 'engineer', ticket.engineer)}
                          onSave={() => handleSaveCell(actualIdx, 'engineer')}
                          onCancel={() => setEditingCell(null)}
                          onChangeEdit={setEditValue}
                          maxChars={25}
                          isApproved={isApproved}
                        />
                      </td>
                      <td>
                        <Cell
                          value={ticket.remarks}
                          isEditing={editingCell?.ticketIdx === actualIdx && editingCell?.fieldName === 'remarks'}
                          editValue={editValue}
                          onEdit={() => !isApproved && handleCellClick(actualIdx, 'remarks', ticket.remarks)}
                          onSave={() => handleSaveCell(actualIdx, 'remarks')}
                          onCancel={() => setEditingCell(null)}
                          onChangeEdit={setEditValue}
                          maxChars={25}
                          isApproved={isApproved}
                        />
                      </td>
                    </tr>

                    {/* Expand Detail Row */}
                    {isExpanded && (
                      <tr className="bg-slate-900/40 border-b border-slate-800">
                        <td colSpan="18" className="p-5 text-xs text-slate-300 leading-normal">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
                            <div className="lg:col-span-2 space-y-3">
                              <div>
                                <span className="font-bold text-slate-400 block mb-1">Masalah / Deskripsi Lengkap:</span>
                                <p className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 text-[13px] whitespace-pre-wrap text-white leading-relaxed">{ticket.problem || '-'}</p>
                              </div>
                              <div>
                                <span className="font-bold text-slate-400 block mb-1">Tindakan / Action Taken:</span>
                                <p className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 text-[13px] whitespace-pre-wrap text-white leading-relaxed">{ticket.action || '-'}</p>
                              </div>
                            </div>

                            <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-800/80 space-y-2">
                              <span className="font-bold text-slate-400 block border-b border-slate-800 pb-1.5 mb-2 uppercase tracking-wider text-[10px]">Metadata Tiket</span>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Tipe:</span>
                                <span className="font-semibold text-white">{ticket.type}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Requester:</span>
                                <span className="font-semibold text-white">{ticket.requester || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Tanggal:</span>
                                <span className="font-semibold text-white">{ticket.date || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Task Mulai:</span>
                                <span className="font-semibold text-slate-300">{ticket.taskStarted || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Task Selesai:</span>
                                <span className="font-semibold text-slate-300">{ticket.taskFinished || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Lama Resolusi:</span>
                                <span className="font-semibold text-[#06B6D4] font-mono">{ticket.resolutionTime || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Engineer:</span>
                                <span className="font-semibold text-white">{ticket.engineer || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Cell({ value, isEditing, editValue, onEdit, onSave, onCancel, onChangeEdit, maxChars, isApproved }) {
  const isTruncated = maxChars && value && value.length > maxChars
  const display = isTruncated ? value.substring(0, maxChars) + '...' : value

  if (isEditing) {
    return (
      <div className="flex gap-1 items-center">
        <input
          type="text"
          value={editValue}
          onChange={(e) => onChangeEdit(e.target.value)}
          className="table-cell-input text-xs flex-1 min-w-[100px]"
          autoFocus
        />
        <button
          onClick={onSave}
          className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded transition-colors"
        >
          <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
        </button>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
        >
          <X size={12} className="text-red-600 dark:text-red-400" />
        </button>
      </div>
    )
  }

  return (
    <div
      onClick={onEdit}
      className={`table-cell-editable group flex items-center justify-between relative ${isApproved ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <div className="relative group/tooltip flex-1">
        <span className="text-[13px]">{display || '-'}</span>
        {isTruncated && (
          <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block w-72 p-2.5 bg-slate-950 border border-slate-800 text-[11px] text-slate-300 rounded-lg shadow-xl z-50 pointer-events-none whitespace-normal leading-normal">
            {value}
          </div>
        )}
      </div>
      {!isApproved && (
        <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 flex-shrink-0 ml-1.5" />
      )}
    </div>
  )
}
