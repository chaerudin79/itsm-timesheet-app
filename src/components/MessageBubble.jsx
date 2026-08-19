import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import TicketStats from './TicketStats'

export default function MessageBubble({ message }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`${message.tickets && message.tickets.length > 0 ? 'w-full max-w-6xl' : 'max-w-2xl'} ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
        {/* Text content */}
        <div className="mb-3 whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </div>

        {/* Tickets jika ada */}
        {message.tickets && message.tickets.length > 0 && (
          <div className="mt-4 pt-4 border-t border-opacity-20 border-current">
            <TicketStats tickets={message.tickets} />
          </div>
        )}

        {/* Copy button */}
        {!message.tickets && (
          <button
            onClick={handleCopy}
            className="mt-2 inline-flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition-opacity"
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <Check size={14} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
