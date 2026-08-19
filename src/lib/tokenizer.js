// Data tokenization for security
// Masks MAC addresses, IP addresses, phone numbers, and NPP before sending to AI API

export function tokenize(text) {
  if (!text) return { tokenizedText: text, tokenMap: {} }

  let tokenizedText = text
  const tokenMap = {}
  let macCount = 0
  let ipCount = 0
  let phoneCount = 0
  let nppCount = 0

  // Regex untuk MAC address (XX:XX:XX:XX:XX:XX atau XX-XX-XX-XX-XX-XX)
  const macRegex = /([0-9A-Fa-f]{2}[:\-]){5}[0-9A-Fa-f]{2}/g
  const macMatches = [...text.matchAll(macRegex)]
  macMatches.forEach(match => {
    const token = `[MAC_${macCount}]`
    tokenMap[token] = match[0]
    tokenizedText = tokenizedText.replace(match[0], token)
    macCount++
  })

  // Regex untuk IPv4 address
  const ipRegex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g
  const ipMatches = [...tokenizedText.matchAll(ipRegex)]
  ipMatches.forEach(match => {
    const token = `[IP_${ipCount}]`
    tokenMap[token] = match[0]
    tokenizedText = tokenizedText.replace(match[0], token)
    ipCount++
  })

  // Nomor HP Indonesia: +62 / 62 / 08 diikuti 8xx dengan total 10-14 digit
  // Contoh: +6281234567890, 08123456789, 62-812-3456-789
  const phoneRegex = /(?:\+62|(?<!\d)62|(?<!\d)0)[\s\-]?8\d[\s\-]?\d{3,4}[\s\-]?\d{3,5}/g
  const phoneMatches = [...tokenizedText.matchAll(phoneRegex)]
  phoneMatches.forEach(match => {
    const token = `[PHONE_${phoneCount}]`
    tokenMap[token] = match[0]
    tokenizedText = tokenizedText.replace(match[0], token)
    phoneCount++
  })

  // NPP format:
  // - P diikuti 5-7 digit (P055677, P90151, P9011234) — format kartu karyawan BNI
  // - Kata kunci "NPP" diikuti spasi opsional dan 5-7 digit (NPP 901511, NPP: 055677)
  // Tidak mask 6-digit standalone untuk hindari false positive (port, versi, tanggal, dll)
  const nppRegex = /\bP\d{5,7}\b|(?:NPP\s*:?\s*)\d{5,7}/g
  const nppMatches = [...tokenizedText.matchAll(nppRegex)]
  nppMatches.forEach(match => {
    const token = `[NPP_${nppCount}]`
    tokenMap[token] = match[0]
    tokenizedText = tokenizedText.replace(match[0], token)
    nppCount++
  })

  return { tokenizedText, tokenMap }
}

export function detokenize(text, tokenMap) {
  if (!text || !tokenMap || Object.keys(tokenMap).length === 0) {
    return text
  }

  let result = text
  Object.entries(tokenMap).forEach(([token, originalValue]) => {
    const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    result = result.replace(regex, originalValue)
  })

  return result
}

export function detokenizeTickets(tickets, tokenMap) {
  if (!tokenMap || Object.keys(tokenMap).length === 0) {
    return tickets
  }

  return tickets.map(ticket => {
    const detokenized = {}
    Object.entries(ticket).forEach(([key, value]) => {
      if (typeof value === 'string') {
        detokenized[key] = detokenize(value, tokenMap)
      } else {
        detokenized[key] = value
      }
    })
    return detokenized
  })
}
