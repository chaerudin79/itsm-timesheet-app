const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta2/interactions'
const GEMINI_MODEL = 'gemini-3.6-flash'
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export async function sendMessageToGemini({ messages, systemPrompt, apiKey = null, timeout = 30000 }) {
  const key = apiKey || GEMINI_API_KEY || localStorage.getItem('geminiApiKey')
  if (!key) throw new Error('Gemini API key not found. Add it in Settings to enable fallback.')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  try {
    const conversation = messages.map(message => `${message.role === 'assistant' ? 'Assistant' : 'User'}:\n${message.content}`).join('\n\n')
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        input: `${systemPrompt}\n\n${conversation}`,
        store: false,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Gemini API error (${response.status}): ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const text = data.steps
      ?.filter(step => step.type === 'model_output')
      .flatMap(step => step.content || [])
      .filter(content => content.type === 'text')
      .map(content => content.text || '')
      .join('')
    if (!text) throw new Error('Empty response from Gemini API')
    return text
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Gemini request timeout. Please try again.')
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}
