import { parseTickets } from './src/lib/ticketParser.js'

const chat = [
  '[10:07, 8/26/2026] User - BNI Citicon: Request to whitelist device for domain join at Citicon',
  '[10:08, 8/26/2026] ITSM NAC BNI: Device has been whitelisted for domain join',
  '[10:15, 8/26/2026] User - BNI Citicon: Request to whitelist device for domain join at Citicon',
  '[11:02, 8/26/2026] ITSM NAC BNI: Device has been whitelisted for domain join',
  '[12:00, 8/27/2026] User - BNI Citicon: Request to whitelist device for domain join at Citicon',
  '[12:05, 8/27/2026] ITSM NAC BNI: Device has been whitelisted for domain join',
  '[13:00, 8/27/2026] User - BNI Citicon: Request to whitelist device for domain join at Citicon',
  '[13:04, 8/27/2026] ITSM NAC BNI: Device has been whitelisted for domain join',
  '[14:00, 8/27/2026] User - BNI Citicon: Request to whitelist device for domain join at Citicon',
  '[14:03, 8/27/2026] ITSM NAC BNI: Device has been whitelisted for domain join',
  '[15:00, 8/27/2026] User - BNI Citicon: Request to whitelist device for domain join at Citicon',
  '[15:04, 8/27/2026] ITSM NAC BNI: Device has been whitelisted for domain join',
  '[16:00, 8/27/2026] User - BNI Citicon: Request to whitelist device for domain join at Citicon',
  '[16:05, 8/27/2026] ITSM NAC BNI: Device has been whitelisted for domain join'
].join('\n')

const response = `Service Request: 7 tickets.

\`\`\`json
[
  {
    "no": 1,
    "source": "WhatsApp",
    "type": "Service Request",
    "requester": "User - BNI Citicon",
    "period": "August",
    "year": 2026,
    "problem": "Request to whitelist device for domain join at Citicon",
    "action": "Device has been whitelisted for domain join",
    "date": "8/26/2026",
    "taskStarted": "8/26/2026 10:07",
    "taskFinished": "8/26/2026 10:08",
    "resolutionTime": "0:01:00",
    "status": "CLOSED",
    "engineer": "ITSM NAC BNI",
    "remarks": "Support Troubleshoot"
  },
  {
    "no": 2,
    "source": "WhatsApp",
    "type": "Service Request",
    "requester": "User - BNI Citicon",
    "period": "August",
    "year": 2026,
    "problem": "Request to whitelist device for domain join at Citicon",
    "action": "Device has been whitelisted for domain join",
    "date": "8/26/2026",
    "taskStarted": "8/26/2026 10:15",
    "taskFinished": "8/26/2026 11:02",
    "resolutionTime": "0:47:00",
    "status": "CLOSED",
    "engineer": "ITSM NAC BNI",
    "remarks": "Support Troubleshoot"
  }
]`

const result = parseTickets(response, chat)
console.log(JSON.stringify({ count: result.tickets.length, nos: result.tickets.map(t => t.no) }, null, 2))
