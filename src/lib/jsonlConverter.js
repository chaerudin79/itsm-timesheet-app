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
      const date = new Date(msg.iso)
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      
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
