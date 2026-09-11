import { parseTickets } from './src/lib/ticketParser.js'

const tickets = [
  { no: 1, problem: 'A', action: 'Fix A', date: '7/2/2026', taskStarted: '7/2/2026 09:00', taskFinished: '7/2/2026 09:40', status: 'OPEN', engineer: 'ITSM NAC BNI' },
  { no: 2, problem: 'B', action: 'Fix B', date: '7/2/2026', taskStarted: '7/2/2026 11:00', taskFinished: '7/2/2026 11:50', status: 'OPEN', engineer: 'ITSM NAC BNI' }
]

const response = ['```json', JSON.stringify(tickets), '```'].join('\n')
const chat = [
  '[08:50, 2/7/2026] User: hello',
  '[09:00, 2/7/2026] ITSM NAC BNI: ok',
  '[09:15, 2/7/2026] User: second issue',
  '[09:30, 2/7/2026] ITSM NAC BNI: looking',
  '[11:00, 2/7/2026] User: third issue',
  '[11:10, 2/7/2026] ITSM NAC BNI: fixed'
].join('\n')

const res = parseTickets(response, chat)
console.log(JSON.stringify(res.tickets.map(t => ({ no: t.no, firstResponseTime: t.firstResponseTime, resolutionTime: t.resolutionTime })), null, 2))
