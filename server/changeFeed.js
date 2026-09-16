import { EventEmitter } from 'node:events'
import { driveClient, getSheetData, fingerprint } from './sheetsRepository.js'

const REVISION_POLL_MS = Number(process.env.REVISION_POLL_MS || 3000)
const HARD_REFRESH_MS = Number(process.env.HARD_REFRESH_MS || 300000)

class SheetWatcher extends EventEmitter {
  constructor(spreadsheetId, sheetName) {
    super(); this.spreadsheetId = spreadsheetId; this.sheetName = sheetName
    this.key = `${spreadsheetId}::${sheetName}`; this.snapshot = null; this.lastModifiedTime = null
    this.lastHardRefresh = 0; this.inflight = null; this.subscribers = 0; this.timer = null
    this.consecutiveErrors = 0; this.lastError = null
  }
  start() { if (!this.timer) { this.timer = setInterval(() => this.tick().catch(() => { }), REVISION_POLL_MS); this.timer.unref?.(); this.tick().catch(() => { }) } }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null }
  invalidate(reason = 'webhook') { return this.refresh(reason) }
  async tick() {
    try {
      const meta = await driveClient().files.get({ fileId: this.spreadsheetId, fields: 'modifiedTime,version', supportsAllDrives: true })
      const modifiedTime = meta.data.modifiedTime
      const changed = modifiedTime !== this.lastModifiedTime
      const stale = Date.now() - this.lastHardRefresh > HARD_REFRESH_MS
      if (changed || !this.snapshot || stale) { this.lastModifiedTime = modifiedTime; await this.refresh(changed ? 'revision' : 'periodic') }
      this.consecutiveErrors = 0; this.lastError = null
    } catch (error) {
      this.consecutiveErrors += 1; this.lastError = error.message; this.emit('error-state', { error: error.message })
    }
  }
  refresh(reason = 'manual') {
    if (this.inflight) return this.inflight
    this.inflight = getSheetData(this.spreadsheetId, this.sheetName).then(data => {
      const etag = fingerprint(data.tickets); const changed = this.snapshot?.etag !== etag
      this.snapshot = { ...data, etag, fetchedAt: new Date().toISOString() }; this.lastHardRefresh = Date.now()
      if (changed) this.emit('changed', { etag, reason, count: data.tickets.length })
      return this.snapshot
    }).finally(() => { this.inflight = null })
    return this.inflight
  }
  async getSnapshot() { if (!this.snapshot) await this.refresh('cold-start'); return this.snapshot }
  status() { return { key: this.key, subscribers: this.subscribers, etag: this.snapshot?.etag ?? null, fetchedAt: this.snapshot?.fetchedAt ?? null, lastModifiedTime: this.lastModifiedTime, ticketCount: this.snapshot?.tickets?.length ?? 0, quarantinedCount: this.snapshot?.quarantined?.length ?? 0, headerIssues: this.snapshot?.headerIssues ?? [], consecutiveErrors: this.consecutiveErrors, lastError: this.lastError } }
}

const watchers = new Map()
export function getWatcher(spreadsheetId, sheetName = 'Sheet1') {
  const key = `${spreadsheetId}::${sheetName}`
  if (!watchers.has(key)) { const watcher = new SheetWatcher(spreadsheetId, sheetName); watcher.setMaxListeners(0); watchers.set(key, watcher); watcher.start() }
  return watchers.get(key)
}
export function allWatcherStatus() { return [...watchers.values()].map(watcher => watcher.status()) }