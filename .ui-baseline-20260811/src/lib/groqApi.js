// Groq API integration - Free Cloud LLM
// Fast inference with LLaMA 3.1 instant model (currently supported)
// API Key from .env file (VITE_GROQ_API_KEY)

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile' // More capable model with higher limits
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

export async function sendMessageToGroq({
  messages,
  systemPrompt,
  customRules = [],
  apiKey = null,
  maxRetries = 3,
  timeout = 30000
}) {
  // Use API key from .env, or override with parameter if provided
  const key = apiKey || GROQ_API_KEY || localStorage.getItem('groqApiKey')

  if (!key) {
    throw new Error('Groq API key not found. Set VITE_GROQ_API_KEY in .env file')
  }

  // Build custom rules string
  const rulesText = customRules.length > 0
    ? `\n\nCustom Rules untuk sesi ini:\n${customRules.join('\n')}`
    : ''

  // Build final system prompt with custom rules
  const finalSystemPrompt = systemPrompt + rulesText

  // Convert messages to Groq format
  const groqMessages = [
    { role: 'system', content: finalSystemPrompt },
    ...messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))
  ]

  // Retry logic with exponential backoff
  let lastError
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: groqMessages,
          temperature: 0.5, // Reduced from 0.7 for faster responses
          max_tokens: 8000, // Enough for large ticket lists; free tier TPM applies per minute not per request
          top_p: 0.9, // Reduced from 0.95 for efficiency
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.error?.message || response.statusText
        throw new Error(`Groq API error (${response.status}): ${errorMsg}`)
      }

      const data = await response.json()
      const text = data.choices[0]?.message?.content

      if (!text) {
        throw new Error('Empty response from Groq API')
      }

      return text
    } catch (error) {
      lastError = error

      // Don't retry on timeout or abort
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again.')
      }

      // Don't retry on auth errors
      if (error.message?.includes('401') || error.message?.includes('403')) {
        throw new Error('Invalid API key. Please check your credentials.')
      }

      // Exponential backoff for retries
      if (attempt < maxRetries - 1) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }

  // All retries failed
  throw new Error(`API request failed after ${maxRetries} attempts: ${lastError?.message}`)
}

export async function validateApiKey(apiKey) {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10,
      })
    })

    if (!response.ok) {
      return false
    }

    return true
  } catch (error) {
    console.error('Groq validation failed:', error)
    return false
  }
}
