import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import { verifySheetAccess, appendTicketsToSheet } from './sheetsRepository.js'
import { getWatcher, allWatcherStatus } from './changeFeed.js'

const app = express()
app.disable('etag')
app.use(express.json({ limit: '5mb' }))

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  exposedHeaders: ['ETag', 'X-Sheet-Fetched-At'],
}))

app.use('/api', (req, res, next) => {
  res.set({ 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', Pragma: 'no-cache', 'Surrogate-Control': 'no-store' })
  next()
})

// Shared-secret auth: only requests from your own frontend should pass.
function requireApiKey(req, res, next) {
  const expected = process.env.BACKEND_API_KEY
  if (!expected) {
    return res.status(500).json({ error: 'BACKEND_API_KEY not configured on server' })
  }
  const provided = req.header('x-api-key') || req.query.key
  const a = Buffer.from(String(provided || ''))
  const b = Buffer.from(String(expected))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Invalid or missing API key' })
  }
  next()
}

app.get('/health', (req, res) => {
  res.json({ ok: true, watchers: allWatcherStatus() })
})

app.get('/api/sheets/verify', requireApiKey, async (req, res) => {
  try {
    const { sheetId } = req.query
    if (!sheetId) return res.status(400).json({ error: 'sheetId is required' })
    const ok = await verifySheetAccess(sheetId)
    res.json({ ok })
  } catch (err) {
    console.error('verify failed:', err.message)
    res.status(500).json({ ok: false, error: err.message })
  }
})

app.get('/api/sheets/data', requireApiKey, async (req, res) => {
  try {
    const { sheetId, sheetName = 'Sheet1', force } = req.query
    if (!sheetId) return res.status(400).json({ error: 'sheetId is required' })
    const watcher = getWatcher(sheetId, sheetName)
    const snapshot = force === '1' ? await watcher.refresh('force') : await watcher.getSnapshot()
    res.set({ ETag: `"${snapshot.etag}"`, 'X-Sheet-Fetched-At': snapshot.fetchedAt })
    if (req.header('if-none-match') === `"${snapshot.etag}"`) return res.status(304).end()
    res.json(snapshot)
  } catch (err) {
    console.error('getSheetData failed:', err.message)
    res.status(502).json({ error: err.message })
  }
})

app.get('/api/sheets/stream', requireApiKey, async (req, res) => {
  const { sheetId, sheetName = 'Sheet1' } = req.query
  if (!sheetId) return res.status(400).json({ error: 'sheetId is required' })
  const watcher = getWatcher(sheetId, sheetName)
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
  res.flushHeaders?.()
  watcher.subscribers++
  const send = (event, data) => { res.write(`event: ${event}\n`); res.write(`data: ${JSON.stringify(data)}\n\n`) }
  try { send('snapshot', await watcher.getSnapshot()) } catch (err) { send('error', { error: err.message }) }
  const onChanged = async () => send('snapshot', await watcher.getSnapshot())
  const onError = payload => send('error', payload)
  watcher.on('changed', onChanged); watcher.on('error-state', onError)
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 20000)
  req.on('close', () => { clearInterval(heartbeat); watcher.off('changed', onChanged); watcher.off('error-state', onError); watcher.subscribers = Math.max(0, watcher.subscribers - 1); res.end() })
})

app.post('/api/sheets/hook', requireApiKey, (req, res) => {
  const { sheetId, sheetName = 'Sheet1' } = req.body || {}
  if (!sheetId) return res.status(400).json({ error: 'sheetId is required' })
  res.json({ ok: true })
  getWatcher(sheetId, sheetName).invalidate('apps-script').catch(err => console.error('hook refresh failed:', err.message))
})

app.post('/api/sheets/append', requireApiKey, async (req, res) => {
  try {
    const { sheetId, sheetName, tickets } = req.body || {}
    if (!sheetId) return res.status(400).json({ error: 'sheetId is required' })
    const result = await appendTicketsToSheet(tickets, sheetId, sheetName || 'Sheet1')
    const snapshot = await getWatcher(sheetId, sheetName || 'Sheet1').invalidate('after-append')
    res.json({ ...result, etag: snapshot.etag })
  } catch (err) {
    console.error('appendTicketsToSheet failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/sheets/diagnostics', requireApiKey, async (req, res) => {
  const { sheetId, sheetName = 'Sheet1' } = req.query
  if (!sheetId) return res.status(400).json({ error: 'sheetId is required' })
  const watcher = getWatcher(sheetId, sheetName)
  await watcher.getSnapshot().catch(() => { })
  res.json(watcher.status())
})

// Debug endpoint: verify current Sheets data
app.get('/api/debug/requesters', requireApiKey, async (req, res) => {
  try {
    const { sheetId } = req.query
    if (!sheetId) return res.status(400).json({ error: 'sheetId required' })
    const tickets = await getSheetData(sheetId, 'Sheet1')
    const uniqueRequesters = [...new Set(tickets.map(t => t.requester).filter(Boolean))]
    const rawNPPValues = [...new Set(tickets.map(t => t.requester).filter(r => /^\d{5,6}$/.test(r)))]
    const hasRawNPP = rawNPPValues.length > 0
    res.json({
      total: tickets.length,
      uniqueRequesters: uniqueRequesters.slice(0, 20),
      uniqueCount: uniqueRequesters.length,
      hasRawNPP,
      rawNPPCount: rawNPPValues.length,
      rawNPPValues,
      sample: tickets.slice(0, 3).map(t => ({ requester: t.requester, problem: t.problem, date: t.date }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 8787
app.listen(PORT, () => {
  console.log(`ITSM Timesheet backend running on http://localhost:${PORT}`)
})
