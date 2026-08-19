import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'

const colorMap = {
  cyan: { bg: 'from-cyan-500/20 to-cyan-600/10', icon: 'text-cyan-400', border: 'border-cyan-500/20' },
  green: { bg: 'from-green-500/20 to-green-600/10', icon: 'text-green-400', border: 'border-green-500/20' },
  red: { bg: 'from-red-500/20 to-red-600/10', icon: 'text-red-400', border: 'border-red-500/20' },
  purple: { bg: 'from-purple-500/20 to-purple-600/10', icon: 'text-purple-400', border: 'border-purple-500/20' },
}

export default function ModernKPICard({
  label,
  value,
  icon: Icon,
  trend = null,
  trendValue = null,
  color = 'cyan',
  animation = true
}) {
  const colors = colorMap[color]
  const isPositive = trend === 'up'

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' }
    }
  }

  const hoverVariants = {
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 }
    }
  }

  return (
    <motion.div
      variants={animation ? containerVariants : hoverVariants}
      initial={animation ? 'hidden' : {}}
      animate={animation ? 'visible' : {}}
      whileHover="hover"
      className={`kpi-card bg-gradient-to-br ${colors.bg} border ${colors.border} group relative overflow-hidden`}
    >
      {/* Background glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} blur-2xl`}></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="kpi-card-label">{label}</p>
            <p className="kpi-card-stat mt-2">{value}</p>
          </div>

          {Icon && (
            <div className={`p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 ${colors.icon}`}>
              <Icon className="w-6 h-6" />
            </div>
          )}
        </div>

        {trend && trendValue && (
          <div className={`kpi-card-trend mt-4 ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{trendValue}% vs last month</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
