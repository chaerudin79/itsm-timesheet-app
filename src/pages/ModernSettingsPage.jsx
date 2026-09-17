import { useState } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, Trash2, Link, Copy, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import SettingsModal from '../components/SettingsModal'
import ModernHeader from '../components/ModernHeader'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

export default function ModernSettingsPage() {
  const { darkMode, toggleDarkMode, customRules, updateCustomRules, sheetId, disconnect } = useAuth()
  const [groqApiKeys, setGroqApiKeys] = useState(() => localStorage.getItem('groqApiKeys') || localStorage.getItem('groqApiKey') || '')
  const [analysisProvider, setAnalysisProvider] = useState(() => localStorage.getItem('analysisProvider') || 'groq')
  const [kimiApiKey, setKimiApiKey] = useState(() => localStorage.getItem('kimiApiKey') || '')
  const [showModal, setShowModal] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sheetId || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Header */}
      <ModernHeader />

      {/* Main Content */}
      <motion.div
        className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-brand-bg text-slate-900 dark:text-brand-text"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <div className="p-6 lg:p-8 max-w-4xl space-y-7">
          {/* Title */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <h1 className="text-[28px] font-semibold text-slate-900 dark:text-white tracking-tight mb-1">Settings</h1>
            <p className="text-slate-500 dark:text-slate-400 text-[14px]">Manage your application preferences and configuration.</p>
          </motion.div>

          {/* Appearance Section */}
          <motion.div
            className="space-y-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h2 className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2" variants={itemVariants}>
              Appearance
            </motion.h2>

            <motion.div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-surface p-5 shadow-sm dark:shadow-none" variants={itemVariants}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white text-sm">Theme</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Choose between light and dark themes</p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center gap-2 transition-colors"
                >
                  {darkMode ? (
                    <>
                      <Sun className="w-4 h-4" />
                      Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4" />
                      Dark Mode
                    </>
                  )}
                </button>
              </div>
            </motion.div>

          </motion.div>

          {/* Google Integration Section */}
          <motion.div
            className="space-y-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h2 className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide" variants={itemVariants}>
              Google Integration
            </motion.h2>

            {/* Google Sheets */}
            <motion.div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-surface p-5 shadow-sm dark:shadow-none" variants={itemVariants}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white text-sm mb-1">Google Sheets</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Connected spreadsheet ID for ticket synchronization</p>
                  {sheetId ? (
                    <div className="bg-slate-50 dark:bg-[#0A0A0B] rounded-md p-3 border border-slate-200 dark:border-white/10">
                      <p className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">{sheetId}</p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-[#0A0A0B] rounded-md p-3 border border-slate-200 dark:border-white/10">
                      <p className="text-xs text-slate-500">Not connected</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {sheetId && (
                    <button
                      onClick={copyToClipboard}
                      className="p-2 rounded-md text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                  <a
                    href={sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}` : '#'}
                    target="_blank"
                    rel="noreferrer"
                    className={`px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center gap-2 transition-colors ${!sheetId ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Link className="w-4 h-4" />
                    Open Sheet
                  </a>
                </div>
              </div>
            </motion.div>

          </motion.div>

          {/* AI Configuration Section */}
          <motion.div
            className="space-y-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
          <motion.h2 className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide" variants={itemVariants}>
              AI Configuration
            </motion.h2>

            <motion.div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-surface p-5 shadow-sm dark:shadow-none" variants={itemVariants}>
              <label className="block font-medium text-slate-900 dark:text-white text-sm mb-1" htmlFor="analysis-provider">AI Provider</label>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Provider yang digunakan saat menganalisis chat berikutnya.</p>
              <select
                id="analysis-provider"
                value={analysisProvider}
                onChange={(e) => {
                  setAnalysisProvider(e.target.value)
                  localStorage.setItem('analysisProvider', e.target.value)
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0A0A0B] border border-slate-200 dark:border-white/10 rounded-md text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-primary"
              >
                <option value="groq">Groq</option>
                <option value="kimi">Kimi (Moonshot AI)</option>
              </select>
            </motion.div>

            {/* Custom Rules */}
            <motion.div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-surface p-5 shadow-sm dark:shadow-none" variants={itemVariants}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white text-sm mb-1">Custom AI Rules</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{customRules?.length || 0} rule{(customRules?.length || 0) !== 1 ? 's' : ''} configured</p>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-3 py-1.5 rounded-md text-sm font-semibold bg-brand-orange text-white hover:bg-brand-orange/90 transition-colors"
                >
                  Manage Rules
                </button>
              </div>
            </motion.div>

            {/* Groq API Key */}
            <motion.div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-surface p-5 shadow-sm dark:shadow-none" variants={itemVariants}>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white text-sm mb-1">Groq API Key</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Required for AI ticket extraction from chats</p>
                </div>
                <div className="relative">
                  <textarea
                    rows={4}
                    value={groqApiKeys}
                    onChange={(e) => {
                      setGroqApiKeys(e.target.value)
                      localStorage.setItem('groqApiKeys', e.target.value)
                    }}
                    placeholder="Paste your Groq API keys, satu per baris atau pisah dengan koma"
                    className="w-full px-3 py-2 pr-14 bg-slate-50 dark:bg-[#0A0A0B] border border-slate-200 dark:border-white/10 rounded-md text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-primary resize-vertical"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium transition-colors"
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Get your API key from <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">console.groq.com</a>
                </p>
                {groqApiKeys && (
                  <p className="text-xs text-amber-600 dark:text-amber-400/80 flex items-center gap-1.5">
                    <span aria-hidden="true">⚠</span> API key disimpan di browser. Jangan gunakan di komputer bersama.
                  </p>
                )}
              </div>
            </motion.div>

            <motion.div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-surface p-5 shadow-sm dark:shadow-none" variants={itemVariants}>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white text-sm mb-1">Kimi API Key</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Untuk provider Kimi. Model: <code>kimi-k2.7-code-highspeed</code></p>
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={kimiApiKey}
                    onChange={(e) => {
                      setKimiApiKey(e.target.value)
                      localStorage.setItem('kimiApiKey', e.target.value)
                    }}
                    placeholder="Paste your Kimi API key"
                    className="w-full px-3 py-2 pr-14 bg-slate-50 dark:bg-[#0A0A0B] border border-slate-200 dark:border-white/10 rounded-md text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-primary"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium transition-colors"
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                {kimiApiKey && (
                  <p className="text-xs text-amber-600 dark:text-amber-400/80 flex items-center gap-1.5">
                    <span aria-hidden="true">⚠</span> API key disimpan di browser. Jangan gunakan di komputer bersama.
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* Security Section */}
          <motion.div
            className="space-y-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h2 className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide" variants={itemVariants}>
              Security & Account
            </motion.h2>

            {/* Disconnect */}
            <motion.div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-white dark:bg-brand-surface p-5 shadow-sm dark:shadow-none" variants={itemVariants}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white text-sm mb-1">Disconnect Account</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Sign out and clear local data</p>
                </div>
                <button
                  onClick={disconnect}
                  className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            </motion.div>
          </motion.div>

          {/* Footer Info */}
          <motion.div
            className="pt-6 border-t border-slate-200 dark:border-white/[0.06] text-center"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <p className="text-xs text-slate-500 dark:text-slate-600">
              ITSM NAC Timesheet Manager • v0.1.0
            </p>
          </motion.div>

          {/* Spacing */}
          <div className="h-8" />
        </div>
      </motion.div>

      {/* Settings Modal */}
      {showModal && (
        <SettingsModal
          customRules={customRules}
          onUpdateRules={updateCustomRules}
          onClose={() => setShowModal(false)}
          apiKeys={groqApiKeys}
          onUpdateApiKeys={(keys) => {
            setGroqApiKeys(keys)
            localStorage.setItem('groqApiKeys', keys)
          }}
        />
      )}
    </>
  )
}
