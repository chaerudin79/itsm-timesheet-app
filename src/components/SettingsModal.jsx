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
  const [analysisProvider, setAnalysisProvider] = useState(() => localStorage.getItem('analysisProvider') || 'groq')
  const [kimiApiKey, setKimiApiKey] = useState(() => localStorage.getItem('kimiApiKey') || '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const rules = rulesText
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0)
    
    onUpdateRules(rules)
    onUpdateApiKeys(apiKeys)
    localStorage.setItem('analysisProvider', analysisProvider)
    localStorage.setItem('kimiApiKey', kimiApiKey.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-[10px] w-full max-w-2xl max-h-[90vh] overflow-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[8px] transition-colors focus:outline-none text-slate-500 dark:text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">AI Provider</label>
            <select
              value={analysisProvider}
              onChange={(e) => setAnalysisProvider(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-[8px] bg-slate-50 dark:bg-brand-bg text-slate-900 dark:text-white focus:outline-none focus:border-brand-primary text-sm"
            >
              <option value="groq">Groq</option>
              <option value="kimi">Kimi (Moonshot AI)</option>
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Pilih provider yang digunakan untuk analisis chat berikutnya.</p>
          </div>

          {/* Groq API Key */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Groq API Keys
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Get free API keys from Groq Console: https://console.groq.com/keys
            </p>
            <div className="flex gap-2">
              <textarea
                rows={4}
                value={apiKeys}
                onChange={(e) => setApiKeys(e.target.value)}
                placeholder="gsk_... atau satu per baris"
                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-[8px] bg-slate-50 dark:bg-brand-bg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-primary font-mono text-sm resize-vertical"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-3 py-2 bg-slate-100 dark:bg-brand-surface border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-white rounded-[8px] transition-colors text-sm font-medium"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Masukkan satu atau lebih API key. Jika satu key kehabisan limit, aplikasi akan coba key berikutnya.
          </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Kimi API Key</label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Digunakan saat provider Kimi dipilih. Model default: <code>kimi-k2.7-code-highspeed</code>.</p>
            <div className="flex gap-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={kimiApiKey}
                onChange={(e) => setKimiApiKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-[8px] bg-slate-50 dark:bg-brand-bg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-primary font-mono text-sm"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-3 py-2 bg-slate-100 dark:bg-brand-surface border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-white rounded-[8px] transition-colors text-sm font-medium"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Custom Rules */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Custom Rules (satu per baris)
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Tambahkan aturan tambahan yang akan selalu diterapkan ke semua sesi
            </p>
            <textarea
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              placeholder="Contoh:&#10;- 1 whitelist per device = 1 tiket terpisah&#10;- Jika ada gitlab issue, gabung menjadi 1 tiket koordinasi&#10;- Engineer default: Tim NAC BNI"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-[8px] bg-slate-50 dark:bg-brand-bg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-primary font-mono text-sm min-h-[150px] resize-none"
            />
          </div>

          {/* Save Status */}
          {saved && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-[8px] text-sm">
              ✓ Settings saved successfully
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-brand-surface hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 rounded-[8px] transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-brand-primary hover:bg-cyan-600 text-white rounded-[8px] transition-colors text-sm font-semibold shadow-sm"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
