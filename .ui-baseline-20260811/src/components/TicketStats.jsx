export default function TicketStats({ tickets }) {
  const total = tickets.length
  const closed = tickets.filter(t => t.status === 'CLOSED').length
  const open = tickets.filter(t => t.status === 'OPEN').length
  const closedPercent = total > 0 ? Math.round((closed / total) * 100) : 0

  const statCard = (value, label, color, icon, percent) => (
    <div className={`card p-4 border-l-4 ${color}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className={`text-3xl font-bold ${color.replace('border', 'text')}`}>
            {value}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{label}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      {percent !== undefined && (
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-500">{percent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${color.replace('border', 'bg')} transition-all duration-500`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {statCard(total, 'Total Tiket', 'border-blue-600 dark:border-blue-400', '📊', null)}
      {statCard(closed, 'Closed', 'border-emerald-600 dark:border-emerald-400', '✅', closedPercent)}
      {statCard(open, 'Open', 'border-amber-600 dark:border-amber-400', '⏳', total > 0 ? 100 - closedPercent : 0)}
    </div>
  )
}

