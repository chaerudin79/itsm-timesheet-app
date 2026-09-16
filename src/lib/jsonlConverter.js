// Convert JSONL chat format to WhatsApp text format for Gemini analysis

export function convertJsonlToWhatsApp(jsonlText) {
  if (!jsonlText || typeof jsonlText !== 'string') return jsonlText

  const lines = jsonlText.trim().split('\n').filter(Boolean)
  
  // Try to parse first line to detect JSONL
  try {
    const firstLine = JSON.parse(lines[0])
    if (!firstLine.iso || !firstLine.text || !firstLine.sender_name) {
      // Not JSONL format, return as-is
      return jsonlText
    }
  } catch {
    // Not JSON, return as-is (assume raw WhatsApp text)
    return jsonlText
  }

  // Convert each JSONL line to WhatsApp format
  const converted = []
  
  for (const line of lines) {
    try {
      const msg = JSON.parse(line)
      
      // Skip non-text messages
      if (msg.type !== 'text' || !msg.text) continue
      
      // Parse ISO timestamp to WhatsApp format [HH.MM, DD/MM/YYYY]
      // ISO is in UTC, convert to WIB (UTC+7)
      const date = new Date(msg.iso)
      const wibOffset = 7 * 60 // WIB = UTC+7 in minutes
      const localDate = new Date(date.getTime() + wibOffset * 60 * 1000)
      
      const hours = String(localDate.getUTCHours()).padStart(2, '0')
      const minutes = String(localDate.getUTCMinutes()).padStart(2, '0')
      const day = String(localDate.getUTCDate()).padStart(2, '0')
      const month = String(localDate.getUTCMonth() + 1).padStart(2, '0')
      const year = localDate.getUTCFullYear()
      
      // WhatsApp format uses DD/MM/YYYY in chat display
      const timestamp = `[${hours}.${minutes}, ${day}/${month}/${year}]`
      const senderName = msg.sender_name || 'Unknown'
      const text = msg.text
      
      converted.push(`${timestamp} ${senderName}: ${text}`)
    } catch (e) {
      // Skip invalid lines
      console.warn('Skipping invalid JSONL line:', e.message)
    }
  }
  
  return converted.join('\n')
}

export function isJsonlFormat(text) {
  if (!text || typeof text !== 'string') return false
  
  const firstLine = text.trim().split('\n')[0]
  if (!firstLine) return false
  
  try {
    const parsed = JSON.parse(firstLine)
    return !!(parsed.iso && parsed.text && parsed.sender_name)
  } catch {
    return false
  }
}
