import { useState, useRef } from 'react'
import { Send, Paperclip, Lock } from 'lucide-react'
import { convertJsonlToWhatsApp, isJsonlFormat } from '../lib/jsonlConverter'

export default function ChatInput({ onSendMessage, disabled }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleSend = () => {
    if (text.trim()) {
      // Auto-detect and convert JSONL to WhatsApp format
      const processedText = isJsonlFormat(text) 
        ? convertJsonlToWhatsApp(text) 
        : text
      
      onSendMessage(processedText)
      setText('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextChange = (e) => {
    setText(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file && (file.type === 'text/plain' || file.name.endsWith('.jsonl') || file.name.endsWith('.txt'))) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result || ''
        setText(content)
        
        // Auto-resize textarea after file load
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'
          }
        }, 0)
      }
      reader.readAsText(file)
    } else {
      alert('Please upload a .txt or .jsonl file')
    }
  }

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-2 items-end">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-icon"
            title="Upload .txt file"
          >
            <Paperclip size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.jsonl"
            onChange={handleFileUpload}
            className="hidden"
          />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Paste chat WhatsApp atau JSONL di sini, atau upload file .txt/.jsonl..."
            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] max-h-[150px]"
          />

          <button
            onClick={handleSend}
            disabled={disabled || !text.trim()}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white transition-colors"
            title="Send (Ctrl+Enter)"
          >
            <Send size={20} />
          </button>
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <Lock size={14} />
          <span>MAC & IP addresses di-mask sebelum dikirim ke API</span>
        </div>
      </div>
    </div>
  )
}
