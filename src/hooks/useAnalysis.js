import { useState, useCallback } from 'react'
import { sendMessageToGroq } from '../lib/groqApi'
import { sendMessageToKimi } from '../lib/kimiApi'
import { appendTicketsToSheet } from '../lib/googleSheetsApi'
import { tokenize, detokenize, detokenizeTickets } from '../lib/tokenizer'
import { getSystemPrompt } from '../lib/systemPrompt'
import { parseTickets } from '../lib/ticketParser'
import { useAuth } from '../context/AuthContext'
import { useSession } from '../context/SessionContext'

const MAX_CHAT_LENGTH = 100000

// ponytail: WhatsApp timestamp regex — shared across chunking helpers
const WA_TS_RE = /^\[?\d{1,2}[.:]\d{2}[,\s]+\d{1,2}\/\d{1,2}\/\d{4}\]?\s*-\s*/

// A pasted export may contain several independent WhatsApp conversations.
// A boundary is an empty line followed by a new timestamp. Empty lines inside
// a NAC form are retained because they are not followed by a timestamp.
function splitChatIntoConversationBlocks(chatText) {
  return chatText
    .trim()
    .split(/\r?\n[\t ]*\r?\n(?=\[?\d{1,2}[.:]\d{2}[,\s]+\d{1,2}\/\d{1,2}\/\d{4}\]?)/)
    .map(block => block.trim())
    .filter(Boolean)
}

/**
 * Smart chunking: split chat at WhatsApp message boundaries so a single
 * conversation thread is never torn in half.  Falls back to line-length
 * splitting when no timestamps are found (plain text paste).
 *
 * Context carry-over: the last few lines of the previous chunk are prepended
 * to the next chunk so the AI sees who was talking and what was discussed.
 */
function splitChatIntoChunks(chatText, maxChunkSize = 15000) {
  const lines = chatText.split(/\r?\n/)

  // Group continuation lines (lines without a timestamp) with the preceding
  // timestamped line so we never split a multi-line WhatsApp message.
  const messages = []     // each element = array of lines belonging to one WA message
  let currentMsg = []

  for (const line of lines) {
    if (WA_TS_RE.test(line) && currentMsg.length > 0) {
      messages.push(currentMsg)
      currentMsg = [line]
    } else {
      currentMsg.push(line)
    }
  }
  if (currentMsg.length > 0) messages.push(currentMsg)

  // Build chunks respecting maxChunkSize, never breaking a message group.
  const CONTEXT_TAIL_LINES = 6 // carry-over lines from previous chunk
  const chunks = []
  let bucket = []
  let bucketLen = 0

  for (const msg of messages) {
    const msgText = msg.join('\n')
    const msgLen = msgText.length + 1

    // If a single message exceeds maxChunkSize, push it as-is (edge case)
    if (msgLen > maxChunkSize) {
      if (bucket.length > 0) {
        chunks.push(bucket.join('\n'))
        bucket = []
        bucketLen = 0
      }
      chunks.push(msgText)
      continue
    }

    if (bucketLen + msgLen > maxChunkSize && bucket.length > 0) {
      const chunkText = bucket.join('\n')
      chunks.push(chunkText)

      // Context carry-over: keep the last N lines so AI has continuity
      const tailLines = chunkText.split('\n').slice(-CONTEXT_TAIL_LINES)
      bucket = [...tailLines, ...msg]
      bucketLen = bucket.join('\n').length
      continue
    }

    bucket.push(...msg)
    bucketLen += msgLen
  }

  if (bucket.length > 0) {
    chunks.push(bucket.join('\n'))
  }

  return chunks
}

function buildAnalysisQueue(chatText, maxChunkSize) {
  return splitChatIntoConversationBlocks(chatText).flatMap((block, blockIndex) =>
    splitChatIntoChunks(block, maxChunkSize).map((text, chunkIndex) => ({
      text,
      blockIndex,
      chunkIndex,
    }))
  )
}

export function useAnalysis() {
  const { customRules, sheetId } = useAuth()
  const { activeSession, updateSession, setSheetsTickets, setLastSheetsSync } = useSession()
  const [loading, setLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState('idle') // idle | syncing | synced | error
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [error, setError] = useState(null)
  const [retryTickets, setRetryTickets] = useState(null)
  const [lastRequestTime, setLastRequestTime] = useState(null)
  const [lastTokenCount, setLastTokenCount] = useState(0)

  const syncToSheets = useCallback(async (tickets) => {
    if (!tickets?.length) return

    // Guard: only sync minimally valid tickets
    const cleaned = tickets.filter(t => t && t.type && t.requester && t.problem && t.action)
    if (cleaned.length === 0) {
      setSyncStatus('error')
      setRetryTickets(null)
      throw new Error('No valid tickets to sync (missing required fields)')
    }

    setSyncStatus('syncing')
    try {
      await appendTicketsToSheet(tickets, sheetId)
      setSyncStatus('synced')
      setLastSyncTime(new Date())
      if (setSheetsTickets) {
        setSheetsTickets(prev => prev ? [...prev, ...tickets] : tickets)
      }
      if (setLastSheetsSync) {
        setLastSheetsSync(new Date())
      }
      setRetryTickets(null)
      setTimeout(() => setSyncStatus('idle'), 3000)
    } catch (err) {
      console.error('Sheets sync failed:', err)
      setSyncStatus('error')
      setRetryTickets(tickets)
      setTimeout(() => setSyncStatus('idle'), 5000)
      throw err
    }
  }, [sheetId])

  const retrySync = useCallback(async () => {
    if (!retryTickets) return
    try {
      await syncToSheets(retryTickets)
    } catch {
      // error state already set inside syncToSheets
    }
  }, [retryTickets, syncToSheets])

  const analyze = useCallback(async (chatText) => {
    if (!activeSession || !chatText.trim()) return
    setError(null)

    if (chatText.length > MAX_CHAT_LENGTH) {
      setError('Chat log too long (limit ~100,000 characters). Please split into multiple parts.')
      return
    }

    setLoading(true)
    try {
      let currentChunkSize = 15000
      let queue = buildAnalysisQueue(chatText, currentChunkSize)
      const processedTickets = []
      const processedTexts = []
      let totalEstimatedTokens = 0

      // Cross-chunk dedup key set
      const seenTicketKeys = new Set()
      const ticketDedupeKey = (t) => {
        const req = (t.requester || '').trim()
        const date = (t.date || '').trim()
        const prob = (t.problem || t.action || '').replace(/\s+/g, ' ').trim()
        const ts = (t.taskStarted || t['Task Started'] || '').trim()
        const tf = (t.taskFinished || t['Task Finished'] || '').trim()
        return `${req}|${date}|${ts}|${tf}|${prob}`
      }

      let i = 0
      while (i < queue.length) {
        const queueItem = queue[i]
        const chunkText = queueItem.text
        try {
          const { tokenizedText, tokenMap } = tokenize(chunkText)

          // Build a context-aware user message so the AI knows which part
          // of the conversation it is looking at.
          let userContent = tokenizedText
          if (queue.length > 1) {
            const header = `[Transkrip ${queueItem.blockIndex + 1}, bagian ${queueItem.chunkIndex + 1}: percakapan ini mandiri. Jangan gabungkan requester, masalah, atau respons ITSM dengan transkrip lain.]`
            userContent = `${header}\n\n${tokenizedText}`
          }

          const messages = [
            { role: 'user', content: userContent }
          ]

          const provider = localStorage.getItem('analysisProvider') || 'groq'
          const response = provider === 'kimi'
            ? await sendMessageToKimi({ messages, systemPrompt: getSystemPrompt(customRules) })
            : await sendMessageToGroq({ messages, systemPrompt: getSystemPrompt(customRules) })

          const estimatedTokens = tokenizedText.length / 4
          totalEstimatedTokens += estimatedTokens

          const detokenizedResponse = detokenize(response, tokenMap)
          const { text, tickets } = parseTickets(detokenizedResponse, chunkText)
          const detokenizedTickets = detokenizeTickets(tickets, tokenMap)

          // Cross-chunk dedup: skip tickets already seen from earlier chunks
          const startNo = (activeSession.tickets?.length || 0) + 1 + processedTickets.length
          let noOffset = 0
          for (const t of detokenizedTickets) {
            const key = ticketDedupeKey(t)
            if (seenTicketKeys.has(key)) continue
            seenTicketKeys.add(key)
            processedTickets.push({ ...t, no: startNo + noOffset, approved: false })
            noOffset++
          }

          if (text && text.trim()) {
            processedTexts.push(text.trim())
          }

          i++
        } catch (err) {
          const is413 = err.message?.includes('413') || err.message?.toLowerCase().includes('too large')
          if (is413 && currentChunkSize > 2000) {
            currentChunkSize = Math.floor(currentChunkSize / 2)
            console.warn(`Got 413. Retrying with smaller chunk size: ${currentChunkSize}`)
            
            // Re-split only the current transcript.  Later transcripts stay
            // separate even when their timestamps overlap this one.
            const currentBlock = queueItem.blockIndex
            const sameBlockItems = queue.slice(i).filter(item => item.blockIndex === currentBlock)
            const laterBlockItems = queue.slice(i).filter(item => item.blockIndex !== currentBlock)
            const subChunks = splitChatIntoChunks(sameBlockItems.map(item => item.text).join('\n'), currentChunkSize)
              .map((text, chunkIndex) => ({ text, blockIndex: currentBlock, chunkIndex }))
            
            queue = [...queue.slice(0, i), ...subChunks, ...laterBlockItems]
            // Retry the same index i (which is now the first subchunk)
            continue
          } else {
            throw err
          }
        }
      }

      // Track API usage for rate limit indicator
      setLastRequestTime(Date.now())
      setLastTokenCount(totalEstimatedTokens)

      const combinedText = processedTexts.join('\n\n')

      const assistantMessage = {
        role: 'assistant',
        content: combinedText,
        tickets: processedTickets,
        timestamp: new Date().toISOString()
      }
      const updatedMessages = [
        ...activeSession.messages,
        { role: 'user', content: chatText, timestamp: new Date().toISOString() },
        assistantMessage,
      ]
      const updatedTickets = [...(activeSession.tickets || []), ...processedTickets]

      if (sheetId && processedTickets.length > 0) {
        try {
          await syncToSheets(processedTickets)

          const approvedTickets = processedTickets.map(ticket => ({ ...ticket, approved: true }))
          const approvedMessage = {
            ...assistantMessage,
            tickets: approvedTickets
          }

          updateSession(activeSession.id, {
            messages: [
              ...activeSession.messages,
              { role: 'user', content: chatText, timestamp: new Date().toISOString() },
              approvedMessage,
            ],
            tickets: [...(activeSession.tickets || []), ...approvedTickets]
          })
        } catch (syncError) {
          console.error('Auto-sync failed:', syncError)
          setError('AI hasil diekstrak, tapi pengiriman ke Google Sheet gagal. Silakan cek koneksi atau sheet ID.')
          updateSession(activeSession.id, { messages: updatedMessages, tickets: updatedTickets })
        }
      } else {
        updateSession(activeSession.id, { messages: updatedMessages, tickets: updatedTickets })
      }
    } catch (err) {
      console.error('Analysis failed:', err)
      let msg = 'An error occurred. Please try again.'
      if (err.message?.includes('timeout')) msg = 'Request timeout. Please try again.'
      else if (err.message?.includes('API key')) msg = 'Invalid API key. Please check settings.'
      else if (err.message?.includes('Empty response')) msg = 'AI returned empty response. Please try again.'
      else if (err.message) msg = `Error: ${err.message}`
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [activeSession, customRules, updateSession, syncToSheets])

  return {
    loading,
    syncStatus,
    lastSyncTime,
    error,
    retryTickets,
    lastRequestTime,
    lastTokenCount,
    analyze,
    retrySync,
    syncToSheets,
    clearError: () => setError(null),
    clearRetry: () => setRetryTickets(null),
  }
}
