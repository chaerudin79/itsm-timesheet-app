import { useState, useEffect } from 'react'
import { Zap, AlertTriangle, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Groq free tier: 6,000 tokens/minute
const GROQ_TPM_LIMIT = 6000
const WARNING_THRESHOLD = 0.8 // 80%
const DANGER_THRESHOLD = 0.95 // 95%

export default function RateLimitIndicator({ 
  visible = true, 
  currentTokens = 0, 
  lastRequestTime = null 
}) {
  const [usagePercent, setUsagePercent] = useState(0)
  const [status, setStatus] = useState('idle') // idle | warning | danger | ok

  useEffect(() => {
    if (!lastRequestTime || currentTokens === 0) {
      setUsagePercent(0)
      setStatus('idle')
      return
    }

    // Calculate time since last request
    const timeSinceRequest = Date.now() - lastRequestTime
    const minutesSinceRequest = timeSinceRequest / 60000

    // Estimate current usage (tokens decay over 1 minute)
    // This is a simplified estimation - actual TPM tracking would require server-side
    const estimatedUsage = Math.max(0, currentTokens - (minutesSinceRequest * GROQ_TPM_LIMIT))
    const percent = Math.min(100, (estimatedUsage / GROQ_TPM_LIMIT) * 100)

    setUsagePercent(percent)

    if (percent >= DANGER_THRESHOLD * 100) {
      setStatus('danger')
    } else if (percent >= WARNING_THRESHOLD * 100) {
      setStatus('warning')
    } else if (percent > 0) {
      setStatus('ok')
    } else {
      setStatus('idle')
    }
  }, [currentTokens, lastRequestTime])

  if (!visible || status === 'idle') return null

  const getStatusConfig = () => {
    switch (status) {
      case 'danger':
        return {
          icon: AlertTriangle,
          color: 'text-[#EF4444]',
          bgColor: 'bg-[#EF4444]/10',
          borderColor: 'border-[#EF4444]/30',
          label: 'API Rate Limit Critical',
          description: 'Approaching Groq free tier limit. Wait a moment before next request.'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-[#F59E0B]',
          bgColor: 'bg-[#F59E0B]/10',
          borderColor: 'border-[#F59E0B]/30',
          label: 'API Rate Limit Warning',
          description: 'High API usage detected. Consider spacing out requests.'
        }
      case 'ok':
        return {
          icon: CheckCircle,
          color: 'text-[#22C55E]',
          bgColor: 'bg-[#22C55E]/10',
          borderColor: 'border-[#22C55E]/30',
          label: 'API Request Successful',
          description: 'Request processed successfully.'
        }
      default:
        return null
    }
  }

  const config = getStatusConfig()
  if (!config) return null

  const Icon = config.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg border ${config.bgColor} ${config.borderColor} backdrop-blur-sm shadow-lg`}
      >
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${config.color}`}>
              {config.label}
            </p>
            <p className="text-xs text-slate-300 mt-1">
              {config.description}
            </p>
            
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${status === 'danger' ? 'bg-[#EF4444]' : status === 'warning' ? 'bg-[#F59E0B]' : 'bg-[#22C55E]'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, usagePercent)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {Math.round(usagePercent)}% of {GROQ_TPM_LIMIT.toLocaleString()} TPM
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}