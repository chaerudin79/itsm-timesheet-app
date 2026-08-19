import { useState } from 'react'
import { X } from 'lucide-react'

export default function SettingsModal({
  customRules,
  onUpdateRules,
  onClose,
  apiKeys: initialApiKeys,
  onUpdateApiKeys
}) {
  const [rulesText, setRulesText] = useState(customRules.join('\n'))
  const [apiKeys, setApiKeys] = useState(initialApiKeys)
  const [showApiKey, setShowApiKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const rules = rulesText
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0)
    
    onUpdateRules(rules)
    onUpdateApiKeys(apiKeys)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] w-full max-w-2xl max-h-[90vh] overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-surface-raised)] rounded-[8px] transition-colors focus:outline-none text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Groq API Key */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Groq API Keys
            </label>
            <p className="text-xs text-slate-400 mb-3">
              Get free API keys from Groq Console: https://console.groq.com/keys
            </p>
            <div className="flex gap-2">
              <textarea
                rows={4}
                value={apiKeys}
                onChange={(e) => setApiKeys(e.target.value)}
                placeholder="gsk_... atau satu per baris"
                className="flex-1 px-3 py-2 border border-[var(--border-subtle)] rounded-[8px] bg-[var(--bg-surface-raised)] text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] font-mono text-sm resize-vertical"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-white/20 text-white rounded-[8px] transition-colors text-sm font-medium"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
          <p className="text-xs text-slate-400 mt-2">
            Masukkan satu atau lebih API key. Jika satu key kehabisan limit, aplikasi akan coba key berikutnya.
          </p>
          </div>

          {/* Custom Rules */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Custom Rules (satu per baris)
            </label>
            <p className="text-xs text-slate-400 mb-3">
              Tambahkan aturan tambahan yang akan selalu diterapkan ke semua sesi
            </p>
            <textarea
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              placeholder="Contoh:&#10;- 1 whitelist per device = 1 tiket terpisah&#10;- Jika ada gitlab issue, gabung menjadi 1 tiket koordinasi&#10;- Engineer default: Tim NAC BNI"
              className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-[8px] bg-[var(--bg-surface-raised)] text-white placeholder-slate-500 focus:outline-none focus:border-[var(--accent)] font-mono text-sm min-h-[150px] resize-none"
            />
          </div>

          {/* Save Status */}
          {saved && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-[8px] text-sm">
              ✓ Settings saved successfully
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
