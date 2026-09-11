import { parseTickets } from './src/lib/ticketParser.js'

const chat = [
  '[10:00, 8/17/2026] User - BNI 10.63.124.4: Request whitelist device for domain join',
  '[10:05, 8/17/2026] ITSM NAC BNI: Device has been whitelisted for domain join',
  '[10:10, 8/18/2026] User - BNI 00:1A:2B:3C:4D:5E: Request whitelist device for access',
  '[10:12, 8/18/2026] ITSM NAC BNI: Device has been whitelisted'
].join('\n')

const response = `Service Request: 2 tickets.

\`\`\`json
[
  {"no":1,"requester":"User - BNI 10.63.124.4","problem":"Request whitelist device for domain join","action":"Device has been whitelisted for domain join","remarks":"IP 10.63.124.4 observed during check","taskStarted":"8/17/2026 10:00","taskFinished":"8/17/2026 10:05"},
  {"no":2,"requester":"User - BNI 00:1A:2B:3C:4D:5E","problem":"Request whitelist device for access","action":"Device has been whitelisted","remarks":"MAC 00:1A:2B:3C:4D:5E observed","taskStarted":"8/18/2026 10:10","taskFinished":"8/18/2026 10:12"}
]`

const result = parseTickets(response, chat)
console.log(JSON.stringify(result.tickets.map(t => ({
  no: t.no,
  requester: t.requester,
  problem: t.problem,
  action: t.action,
  remarks: t.remarks
})), null, 2))
