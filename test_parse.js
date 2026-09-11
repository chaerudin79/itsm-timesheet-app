import { parseTickets } from './src/lib/ticketParser.js'

const broken = `[
  {
    "no": 1,
    "source": "WhatsApp",
    "type": "Problem",
    "requester": "User - BNI",
    "period": "September",
    "year": 2026,
    "problem": "LAN connectivity issue with no internet access (Helpdesk Desktop Tatang)",
    "action": "Device has been whitelisted for intranet access",
    "date": "9/7/2026",
    "taskStarted": "9/7/2026 09:02",
    "taskFinished": "9/7/2026 09:37",
    "resolutionTime": "0:35:00",
    "status": "CLOSED",
    "engineer": "ITSM NAC BNI",
    "remarks": "Support Troubleshoot"
  },
  {
    "no": 2,
    "source": "WhatsApp",
    "type": "Service Request",
    "requester": "User - BNI",
    "period": "September",
    "year": 2026,
    "problem": "Request to whitelist device for intranet access (Helpdesk Desktop Tatang)",
    "action": "Device has been whitelisted for intranet access",
    "date": "9/7/2026",
    "taskStarted": "9/7/2026 11:22",
    "taskFinished": "9/7/2026 11:25",
    "resolutionTime": "0:03:00",
    "status": "CLOSED",
    "engineer": "ITSM NAC BNI",
    "remarks": "Support Troubleshoot"
  },
  {
    "no": 3,
    "source`

const res = parseTickets(broken)
console.log('Result tickets count:', res.tickets.length)
console.log(JSON.stringify(res.tickets, null, 2))

