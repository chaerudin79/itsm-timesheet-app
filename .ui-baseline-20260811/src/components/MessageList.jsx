import { useState, useEffect, useRef, useMemo } from 'react'
import MessageBubble from './MessageBubble'
import SkeletonLoader from './SkeletonLoader'
import ExportModal from './ExportModal'
import TicketTable from './TicketTable'

export default function MessageList({ messages, loading, onUpdateTickets, onApproveTickets, tickets = [], allTickets = [] }) {
  const [showExportModal, setShowExportModal] = useState(false)
  const endRef = useRef(null)
  const displayTickets = useMemo(() => {
    return tickets.length > 0 ? tickets : allTickets
  }, [tickets, allTickets])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
            <p>Paste chat WhatsApp di sini untuk mulai analisa</p>
          </div>
        ) : (
          <>
            {displayTickets.length > 0 ? (
              <div className="w-full mb-4">
                <div className="mb-2 text-sm font-semibold text-[#06B6D4]">
                  {displayTickets.length} tickets loaded
                </div>
                <div className="bg-[#111827] rounded-lg border border-white/10 p-4">
                  <TicketTable
                    tickets={displayTickets}
                    onUpdateTickets={onUpdateTickets}
                    onApproveTickets={onApproveTickets}
                  />
                </div>
              </div>
            ) : null}

            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))}
            </div>
          </>
        )}

        {loading && (
          <div className="mt-4">
            <SkeletonLoader count={1} type="message" />
          </div>
        )}

        <div ref={endRef} />
      </div>

      {showExportModal && (
        <ExportModal
          tickets={tickets}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </>
  )
}
