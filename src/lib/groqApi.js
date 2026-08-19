// Groq API integration - Free Cloud LLM
// API Key from .env file (VITE_GROQ_API_KEY)

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = import.meta.env.VITE_GROQ_MODEL || 'openai/gpt-oss-120b'
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_TPM_LIMIT = Number(import.meta.env.VITE_GROQ_TPM_LIMIT) || 8000
const GROQ_MAX_OUTPUT_TOKENS = Number(import.meta.env.VITE_GROQ_MAX_OUTPUT_TOKENS) || 2000
const GROQ_TPM_BUFFER = Number(import.meta.env.VITE_GROQ_TPM_BUFFER) || 500
const GROQ_MIN_OUTPUT_TOKENS = 512

function parseApiKeys(raw) {
  if (!raw || typeof raw !== 'string') return []

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map(String).map(k => k.trim()).filter(Boolean)
    }
  } catch {
    // Not JSON, continue parsing as text
  }

  return raw
    .split(/[,\n;]/)
    .map(k => k.trim())
    .filter(Boolean)
}

function getStoredGroqApiKeys() {
  const rawKeys = localStorage.getItem('groqApiKeys')
  if (rawKeys) {
    return parseApiKeys(rawKeys)
  }

  const legacyKey = localStorage.getItem('groqApiKey')
  return parseApiKeys(legacyKey)
}

function getGroqApiKeys(apiKeys, apiKey) {
  if (Array.isArray(apiKeys) && apiKeys.length > 0) {
    return apiKeys.map(String).map(k => k.trim()).filter(Boolean)
  }

  if (typeof apiKey === 'string' && apiKey.trim().length > 0) {
    return parseApiKeys(apiKey)
  }

  const envKeyArray = parseApiKeys(GROQ_API_KEY)
  const storedKeys = getStoredGroqApiKeys()

  return [...envKeyArray, ...storedKeys].filter(Boolean)
}

function isRateLimitError(message) {
  return /429|rate limit|limit reached|TPD|tokens per day/i.test(message)
}

function isRequestTooLargeError(message) {
  return /413|request too large|tokens per minute|TPM/i.test(message)
}

function isAuthError(message) {
  return /401|403|invalid api key|authentication/i.test(message)
}

function isModelNotFoundError(message) {
  return /404|model .*does not exist|do not have access/i.test(message)
}

function estimateTokenCount(text = '') {
  return Math.ceil(String(text).length / 4)
}

function estimateMessagesTokenCount(messages) {
  return messages.reduce((total, message) => {
    return total + estimateTokenCount(message.content) + 12
  }, 0)
}

function getMaxTokensForRequest(groqMessages) {
  const estimatedInputTokens = estimateMessagesTokenCount(groqMessages)
  const availableOutputTokens = GROQ_TPM_LIMIT - estimatedInputTokens - GROQ_TPM_BUFFER

  if (availableOutputTokens < GROQ_MIN_OUTPUT_TOKENS) {
    throw new Error(`Groq API error (413): Request too large for current ${GROQ_TPM_LIMIT} TPM limit. Please split the chat into smaller parts.`)
  }

  return Math.max(
    GROQ_MIN_OUTPUT_TOKENS,
    Math.min(GROQ_MAX_OUTPUT_TOKENS, availableOutputTokens)
  )
}

async function performGroqRequest({ key, groqMessages, timeout, maxTokens }) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: groqMessages,
        temperature: 0.5,
        max_tokens: maxTokens,
        top_p: 0.9,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMsg = errorData.error?.message || response.statusText
      throw new Error(`Groq API error (${response.status}): ${errorMsg}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) {
      throw new Error('Empty response from Groq API')
    }

    return text
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function sendMessageToGroq({
  messages,
  systemPrompt,
  customRules = [],
  apiKeys = null,
  apiKey = null,
  maxRetries = 3,
  timeout = 30000,
}) {
  const keys = getGroqApiKeys(apiKeys, apiKey)

  if (keys.length === 0) {
    throw new Error('Groq API key not found. Set VITE_GROQ_API_KEY or configure Groq API keys in settings.')
  }

  const rulesText = customRules.length > 0
    ? `\n\nCustom Rules untuk sesi ini:\n${customRules.join('\n')}`
    : ''

  const finalSystemPrompt = systemPrompt + rulesText
  const groqMessages = [
    { role: 'system', content: finalSystemPrompt },
    ...messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })),
  ]
  const maxTokens = getMaxTokensForRequest(groqMessages)

  let lastError = null

  for (let index = 0; index < keys.length; index++) {
    const key = keys[index]
    let attempt = 0

    while (attempt < maxRetries) {
      try {
        return await performGroqRequest({ key, groqMessages, timeout, maxTokens })
      } catch (error) {
        lastError = error

        if (error.name === 'AbortError') {
          throw new Error('Request timeout. Please try again.')
        }

        const message = error.message || ''
        if (isAuthError(message) && keys.length === 1) {
          throw new Error('Invalid API key. Please check your credentials.')
        }

        if (isRateLimitError(message)) {
          // Switch to next key when rate-limited.
          break
        }

        if (isRequestTooLargeError(message)) {
          throw error
        }

        if (isModelNotFoundError(message)) {
          throw new Error(`Groq model "${GROQ_MODEL}" is unavailable. Set VITE_GROQ_MODEL to an active Groq model, for example "openai/gpt-oss-120b".`)
        }

        // If this is the last attempt for the current key, either retry or move to next.
        if (attempt < maxRetries - 1) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000)
          await new Promise(resolve => setTimeout(resolve, delayMs))
          attempt += 1
          continue
        }

        // If another key exists, move to it. Otherwise, throw.
        if (index < keys.length - 1) {
          break
        }

        if (isAuthError(message)) {
          throw new Error('Invalid API key. Please check your credentials.')
        }

        throw error
      }
    }
  }

  throw new Error(`All Groq keys failed. Last error: ${lastError?.message || 'Unknown error'}`)
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
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Groq validation failed:', error)
    return false
  }
}
