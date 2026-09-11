// Kimi (Moonshot AI) OpenAI-compatible chat-completions integration.
const KIMI_BASE_URL = (import.meta.env.VITE_KIMI_BASE_URL || 'https://api.moonshot.ai/v1').replace(/\/$/, '')
const KIMI_MODEL = import.meta.env.VITE_KIMI_MODEL || 'kimi-k2.7-code-highspeed'
const KIMI_API_KEY = import.meta.env.VITE_KIMI_API_KEY
// K2.7 Code has mandatory reasoning. Leave sufficient tokens for both the
// reasoning phase and the final JSON ticket response.
const KIMI_MAX_TOKENS = Number(import.meta.env.VITE_KIMI_MAX_OUTPUT_TOKENS) || 32768

function getKimiApiKey(apiKey) {
  return apiKey?.trim() || KIMI_API_KEY || localStorage.getItem('kimiApiKey')?.trim() || ''
}

export async function sendMessageToKimi({ messages, systemPrompt, apiKey = null, timeout = 60000 }) {
  const key = getKimiApiKey(apiKey)
  if (!key) {
    throw new Error('Kimi API key not found. Set VITE_KIMI_API_KEY or configure it in Settings.')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(message => ({
            role: message.role === 'user' ? 'user' : 'assistant',
            content: message.content,
          })),
        ],
        // kimi-k2.7-code-highspeed only accepts the default temperature.
        temperature: 1,
        max_tokens: KIMI_MAX_TOKENS,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || response.statusText
      throw new Error(`Kimi API error (${response.status}): ${errorMessage}`)
    }

    const data = await response.json()
    const choice = data.choices?.[0]
    const content = choice?.message?.content
    const text = Array.isArray(content)
      ? content.map(part => part?.text || '').join('')
      : content
    if (!text || !String(text).trim()) {
      const reason = choice?.finish_reason ? ` (finish reason: ${choice.finish_reason})` : ''
      throw new Error(`Kimi returned no final response${reason}. Increase VITE_KIMI_MAX_OUTPUT_TOKENS or try a shorter chat.`)
    }
    return text
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Kimi request timeout. Please try again.')
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}
