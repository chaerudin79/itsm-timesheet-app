import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, AlertCircle, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAnalysis } from '../hooks/useAnalysis'
import { useSession } from '../context/SessionContext'
import { useAuth } from '../context/AuthContext'
import MessageList from '../components/MessageList'
import ChatInput from '../components/ChatInput'
import GoogleSheetsStatus from '../components/GoogleSheetsStatus'
import SettingsModal from '../components/SettingsModal'
import ModernHeader from '../components/ModernHeader'
import RateLimitIndicator from '../components/RateLimitIndicator'

const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

export default function ModernAnalyzerPage() {
  const navigate = useNavigate()
  const { customRules, updateCustomRules, sheetId } = useAuth()
  const { sessions, activeSession, activeSessionId, setActiveSessionId, createSession, deleteSession, updateSession, allTickets } = useSession()
  const { loading, syncStatus, lastSyncTime, error, retryTickets, lastRequestTime, lastTokenCount, analyze, retrySync, syncToSheets, clearError, clearRetry } = useAnalysis()

  // Handle ticket approval and Google Sheets sync
  const handleApproveTickets = async (ticketsToApprove) => {
    if (!activeSession || !ticketsToApprove || ticketsToApprove.length === 0) return

    try {
      await syncToSheets(ticketsToApprove)
    } catch (err) {
      console.error('Failed to sync approved tickets:', err)
      return
    }

    // Mark as approved in session tickets
    const updatedTickets = activeSession.tickets.map(t => {
      const match = ticketsToApprove.some(at => at.no === t.no)
      if (match) return { ...t, approved: true }
      return t
    })

    // Also update message tickets
    const updatedMessages = activeSession.messages.map(msg => {
      if (msg.tickets && msg.tickets.length > 0) {
        return {
          ...msg,
          tickets: msg.tickets.map(t => {
            const match = ticketsToApprove.some(at => at.no === t.no)
            if (match) return { ...t, approved: true }
            return t
          })
        }
      }
      return msg
    })

    updateSession(activeSession.id, { tickets: updatedTickets, messages: updatedMessages })
  }
  const [showSettings, setShowSettings] = useState(false)
  const [groqApiKeys, setGroqApiKeys] = useState(() => {
    const stored = localStorage.getItem('groqApiKeys') || localStorage.getItem('groqApiKey') || ''
    return stored
  })

  if (!activeSession) {
    return (
      <>
        <ModernHeader />
        <motion.div
          className="flex-1 flex flex-col items-center justify-center p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="text-center"
            variants={fadeInVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="w-12 h-12 bg-white/[0.05] rounded-lg flex items-center justify-center mx-auto mb-5">
              <Plus className="w-6 h-6 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1.5">No Analysis Sessions</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-md">
              Create a new analysis session to start extracting tickets from WhatsApp chats using AI
            </p>
            <motion.button
              onClick={createSession}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-[var(--brand-orange)] text-white hover:bg-[var(--brand-orange-hover)] transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus className="w-4 h-4" />
              New Analysis Session
            </motion.button>
          </motion.div>
        </motion.div>
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <ModernHeader />

      {/* Main Content */}
      <motion.div
        className="flex-1 flex overflow-hidden bg-[var(--bg-base)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {/* Sessions Sidebar */}
        <aside className="w-64 border-r border-[var(--border-subtle)] flex flex-col bg-[var(--bg-surface)]">
          {/* Sessions Header */}
          <div className="p-3 border-b border-[var(--border-subtle)]">
            <button
              onClick={createSession}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-[7px] text-[13px] font-semibold bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Session
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative rounded-md p-2.5 cursor-pointer transition-colors duration-150 ${activeSessionId === session.id
                  ? 'bg-[var(--accent)]/10 border-l-2 border-[var(--accent)] pl-[9px]'
                  : 'hover:bg-white/[0.05]'
                  }`}
                onClick={() => setActiveSessionId(session.id)}
              >
                <p className={`text-sm font-medium truncate ${activeSessionId === session.id ? 'text-[var(--accent)]' : 'text-slate-300 group-hover:text-white'
                  }`}>
                  {session.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {session.tickets?.length || 0} tickets
                </p>
                {activeSessionId === session.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSession(session.id)
                    }}
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Sync Status */}
          <div className="p-3 border-t border-[var(--border-subtle)]">
            <GoogleSheetsStatus syncStatus={syncStatus} lastSyncTime={lastSyncTime} sheetId={sheetId} />
          </div>
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Session Title with Back Button */}
          <div className="border-b border-[var(--border-subtle)] px-5 py-3.5 flex items-center gap-3 bg-[var(--bg-surface)]">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white px-2 py-1 rounded-md hover:bg-white/[0.06] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div>
              <h2 className="text-[14px] font-semibold text-white">{activeSession.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeSession.tickets?.length || 0} tickets extracted
              </p>
            </div>
          </div>

          {/* Messages */}
          <MessageList
            messages={activeSession.messages}
            loading={loading}
            tickets={activeSession.tickets || []}
            allTickets={allTickets}
            onUpdateTickets={(tickets) => updateSession(activeSession.id, { tickets })}
            onApproveTickets={handleApproveTickets}
          />

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mx-4 mb-4 px-4 py-3 bg-red-500/[0.06] border border-red-500/20 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[13px] text-red-400 font-medium">Error</p>
                <p className="text-xs text-slate-400 mt-0.5">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="text-slate-500 hover:text-white transition-colors ml-2 flex-shrink-0"
              >
                ×
              </button>
            </motion.div>
          )}

          {/* Retry Banner */}
          {retryTickets && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mx-4 mb-4 px-4 py-3 bg-amber-500/[0.06] border border-amber-500/20 rounded-lg flex items-start gap-3"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[13px] text-amber-400 font-medium">Sync Failed</p>
                <p className="text-xs text-slate-400 mt-0.5">Tickets saved locally. Retry syncing to Google Sheets.</p>
                <div className="flex gap-2 mt-2.5">
                  <button
                    onClick={retrySync}
                    className="text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-500/85 text-black rounded-md font-medium transition-colors"
                  >
                    Retry Sync
                  </button>
                  <button
                    onClick={clearRetry}
                    className="text-xs px-3 py-1.5 text-slate-400 hover:text-white transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Input */}
          <ChatInput onSendMessage={analyze} disabled={loading} />
        </div>
      </motion.div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          customRules={customRules}
          onUpdateRules={updateCustomRules}
          onClose={() => setShowSettings(false)}
          apiKeys={groqApiKeys}
          onUpdateApiKeys={(keys) => {
            setGroqApiKeys(keys)
            localStorage.setItem('groqApiKeys', keys)
          }}
        />
      )}

      {/* Rate Limit Indicator */}
      <RateLimitIndicator
        visible={true}
        currentTokens={lastTokenCount}
        lastRequestTime={lastRequestTime}
      />
    </>
  )
}
