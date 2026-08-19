import { motion } from 'framer-motion'
import { Activity, Users, Clock, AlertCircle } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
}

export function SLAComplianceWidget() {
  const compliance = 98.5
  const trend = 2.3

  return (
    <motion.div className="card-base p-6" variants={itemVariants}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="chart-title">SLA Compliance</h3>
        <AlertCircle className="w-5 h-5 text-brand-primary" />
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-white">{compliance}%</span>
            <span className="text-sm text-brand-success">+{trend}% vs last week</span>
          </div>
          <div className="w-full bg-slate-800/50 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-brand-success to-green-500"
              initial={{ width: 0 }}
              animate={{ width: `${compliance}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/50">
          <div>
            <p className="text-xs text-slate-500 mb-1">On Time</p>
            <p className="text-lg font-semibold text-brand-success">287</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Breached</p>
            <p className="text-lg font-semibold text-brand-danger">5</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function RecentActivityWidget() {
  const activities = [
    { type: 'created', user: 'Alice Johnson', ticket: 'NAC-1234', time: '2 min ago' },
    { type: 'closed', user: 'Bob Smith', ticket: 'NAC-1233', time: '15 min ago' },
    { type: 'assigned', user: 'Charlie Brown', ticket: 'NAC-1232', time: '1 hour ago' },
  ]

  return (
    <motion.div className="card-base p-6" variants={itemVariants}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="chart-title">Recent Activity</h3>
        <Activity className="w-5 h-5 text-brand-primary" />
      </div>

      <div className="space-y-3">
        {activities.map((activity, idx) => (
          <motion.div
            key={idx}
            className="flex items-start gap-3 pb-3 border-b border-slate-800/50 last:border-0"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <div className="w-2 h-2 rounded-full bg-brand-primary mt-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-white">{activity.user}</span>
                {' '}
                <span className="text-slate-400">
                  {activity.type === 'created' && 'created'}
                  {activity.type === 'closed' && 'closed'}
                  {activity.type === 'assigned' && 'assigned'}
                </span>
                {' '}
                <span className="font-semibold text-brand-primary">{activity.ticket}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export function TopEngineersWidget() {
  const engineers = [
    { name: 'Alice Johnson', tickets: 47, efficiency: 98 },
    { name: 'Bob Smith', tickets: 42, efficiency: 95 },
    { name: 'Charlie Brown', tickets: 38, efficiency: 92 },
  ]

  return (
    <motion.div className="card-base p-6" variants={itemVariants}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="chart-title">Top Engineers</h3>
        <Users className="w-5 h-5 text-brand-primary" />
      </div>

      <div className="space-y-4">
        {engineers.map((eng, idx) => (
          <motion.div
            key={idx}
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{eng.name}</p>
                <p className="text-xs text-slate-500">{eng.tickets} tickets</p>
              </div>
              <span className="text-sm font-bold text-brand-success">{eng.efficiency}%</span>
            </div>
            <div className="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-brand-primary to-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${eng.efficiency}%` }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: idx * 0.2 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export function QuickStatsWidget() {
  const stats = [
    { icon: Clock, label: 'Avg Resolution', value: '4.2h', color: 'brand-primary' },
    { icon: Activity, label: 'This Week', value: '+18%', color: 'brand-success' },
  ]

  return (
    <motion.div
      className="grid grid-cols-2 gap-3"
      variants={containerVariants}
    >
      {stats.map((stat, idx) => {
        const Icon = stat.icon
        return (
          <motion.div key={idx} className="card-base p-4" variants={itemVariants}>
            <Icon className={`w-5 h-5 text-${stat.color} mb-3`} />
            <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-white">{stat.value}</p>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
