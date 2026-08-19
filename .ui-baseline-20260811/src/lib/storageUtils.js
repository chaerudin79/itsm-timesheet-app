/**
 * Safe localStorage operations with validation
 */

export function safeJSONParse(jsonString, defaultValue = null) {
  if (!jsonString) return defaultValue
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.warn('Failed to parse localStorage data:', error)
    return defaultValue
  }
}

export function safeGetItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key)
    return item ? safeJSONParse(item, defaultValue) : defaultValue
  } catch (error) {
    console.warn(`Failed to get localStorage item "${key}":`, error)
    return defaultValue
  }
}

export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.warn(`Failed to set localStorage item "${key}":`, error)
    return false
  }
}

// Strip semua ```json ... ``` blocks dari content message yang tersimpan corrupt
function cleanMessageContent(content) {
  if (!content || typeof content !== 'string') return content
  return content.replace(/```json\n?[\s\S]*?```/g, '').trim()
}

export function validateSession(session) {
  if (!session || typeof session !== 'object') return null

  return {
    id: session.id || Date.now().toString(),
    title: String(session.title || 'Untitled Session').slice(0, 100),
    messages: Array.isArray(session.messages)
      ? session.messages.map(msg => ({
        ...msg,
        content: cleanMessageContent(msg.content)
      }))
      : [],
    tickets: Array.isArray(session.tickets) ? session.tickets : [],
    createdAt: session.createdAt || new Date().toISOString(),
    updatedAt: session.updatedAt || new Date().toISOString()
  }
}

export function validateSessions(sessions) {
  if (!Array.isArray(sessions)) return []
  return sessions
    .map(validateSession)
    .filter(s => s !== null)
}
