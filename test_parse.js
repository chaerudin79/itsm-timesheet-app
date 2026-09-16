import { parseTickets } from './src/lib/ticketParser.js'

const samples = [
  {
    name: 'strip npp and hostname metadata',
    payload: `[
      {
        "no": 1,
        "source": "WhatsApp",
        "type": "Problem",
        "requester": "User - Menara BNI",
        "period": "September",
        "year": 2026,
        "problem": "Endpoint unable to connect to WiFi-Intranet at Menara BNI (Lutfi / Divisi IT / NPP 901511 / Hostname-ABC123 / Lt.17)",
        "action": "Resolved after installing Trellix agent version 5.7.8",
        "date": "9/7/2026",
        "taskStarted": "9/7/2026 09:02",
        "taskFinished": "9/7/2026 09:37",
        "resolutionTime": "0:35:00",
        "status": "CLOSED",
        "engineer": "ITSM NAC BNI",
        "remarks": "Support Troubleshoot"
      }
    ]`,
    expect: {
      hasNpp: false,
      hasHostname: false,
      hasName: true,
      hasDivision: true,
      hasLocation: true
    }
  }
]

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

for (const sample of samples) {
  const res = parseTickets(sample.payload)
  const problemText = res.tickets[0]?.problem || ''
  console.log(`Sample: ${sample.name}`)
  console.log(problemText)
  console.log('hasNpp:', /\bNPP\b|\bP\d{5,7}\b|\d{5,7}/.test(problemText))
  console.log('hasHostname:', /hostname|host name|PC name|computer name/i.test(problemText))
  console.log('hasName:', /\b[A-Z][a-z]+\b/.test(problemText))
  console.log('hasDivision:', /Divisi|Division|Department/i.test(problemText))
  console.log('hasLocation:', /Menara BNI|Plaza BNI|Citicon|Grha BNI|RDTX|Lt\.|Location/i.test(problemText))
  console.log('---')
}

const res = parseTickets(broken)
console.log('Result tickets count:', res.tickets.length)
console.log(JSON.stringify(res.tickets, null, 2))

