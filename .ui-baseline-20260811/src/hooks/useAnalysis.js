import { useState, useCallback } from 'react'
import { sendMessageToGroq } from '../lib/groqApi'
import { appendTicketsToSheet } from '../lib/googleSheetsApi'
import { tokenize, detokenize, detokenizeTickets } from '../lib/tokenizer'
import { getSystemPrompt } from '../lib/systemPrompt'
import { parseTickets } from '../lib/ticketParser'
import { useAuth } from '../context/AuthContext'
import { useSession } from '../context/SessionContext'

const MAX_CHAT_LENGTH = 100000

function splitChatIntoChunks(chatText, maxChunkSize = 5000) {
  const lines = chatText.split(/\r?\n/)
  const chunks = []
  let currentChunk = []
  let currentLength = 0

  for (const line of lines) {
    if (line.length > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'))
        currentChunk = []
        currentLength = 0
      }
      chunks.push(line)
      continue
    }

    if (currentLength + line.length + 1 > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'))
      currentChunk = []
      currentLength = 0
    }

    currentChunk.push(line)
    currentLength += line.length + 1
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n'))
  }

  return chunks
}

export function useAnalysis() {
  const { customRules, sheetId, getActiveAuth } = useAuth()
  const { activeSession, updateSession } = useSession()
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
      const auth = await getActiveAuth()
      await appendTicketsToSheet(tickets, auth.accessToken, sheetId)
      setSyncStatus('synced')
      setLastSyncTime(new Date())
      setRetryTickets(null)
      setTimeout(() => setSyncStatus('idle'), 3000)
    } catch (err) {
      console.error('Sheets sync failed:', err)
      setSyncStatus('error')
      setRetryTickets(tickets)
      setTimeout(() => setSyncStatus('idle'), 5000)
      throw err
    }
  }, [getActiveAuth, sheetId])

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
      let currentChunkSize = 5000
      let queue = splitChatIntoChunks(chatText, currentChunkSize)
      const processedTickets = []
      const processedTexts = []
      let totalEstimatedTokens = 0

      let i = 0
      while (i < queue.length) {
        const chunkText = queue[i]
        try {
          const { tokenizedText, tokenMap } = tokenize(chunkText)
          const messages = [
            { role: 'user', content: tokenizedText }
          ]

          const response = await sendMessageToGroq({
            messages,
            systemPrompt: getSystemPrompt(customRules),
          })

          const estimatedTokens = tokenizedText.length / 4
          totalEstimatedTokens += estimatedTokens

          const detokenizedResponse = detokenize(response, tokenMap)
          const { text, tickets } = parseTickets(detokenizedResponse, chunkText)
          const detokenizedTickets = detokenizeTickets(tickets, tokenMap)

          const startNo = (activeSession.tickets?.length || 0) + 1 + processedTickets.length
          const sequentialTickets = detokenizedTickets.map((t, idx) => ({
            ...t,
            no: startNo + idx,
            approved: false,
          }))

          processedTickets.push(...sequentialTickets)
          if (text && text.trim()) {
            processedTexts.push(text.trim())
          }

          i++
        } catch (err) {
          const is413 = err.message?.includes('413') || err.message?.toLowerCase().includes('too large')
          if (is413 && currentChunkSize > 1000) {
            currentChunkSize = Math.floor(currentChunkSize / 2)
            console.warn(`Got 413. Retrying with smaller chunk size: ${currentChunkSize}`)
            
            // Re-split from current index i to the end
            const remainingText = queue.slice(i).join('\n')
            const subChunks = splitChatIntoChunks(remainingText, currentChunkSize)
            
            queue = [...queue.slice(0, i), ...subChunks]
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

      const updatedMessages = [
        ...activeSession.messages,
        { role: 'user', content: chatText, timestamp: new Date().toISOString() },
        { role: 'assistant', content: combinedText, tickets: processedTickets, timestamp: new Date().toISOString() },
      ]
      const updatedTickets = [...(activeSession.tickets || []), ...processedTickets]

      updateSession(activeSession.id, { messages: updatedMessages, tickets: updatedTickets })
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
