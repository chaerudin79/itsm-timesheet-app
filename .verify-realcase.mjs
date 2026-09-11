import { parseTickets } from './src/lib/ticketParser.js'

const response = `
```json
[
  {
    "no": 1,
    "problem": "Issue 1",
    "action": "Handled",
    "date": "8/27/2026",
    "taskStarted": "8/27/2026 10:46",
    "taskFinished": "8/27/2026 10:59",
    "resolutionTime": "0:13:00",
    "firstResponseTime": "",
    "status": "CLOSED",
    "engineer": "ITSM NAC BNI",
    "remarks": "Support Troubleshoot"
  },
  {
    "no": 2,
    "problem": "Issue 2",
    "action": "Handled",
    "date": "8/28/2026",
    "taskStarted": "8/28/2026 07:53",
    "taskFinished": "8/28/2026 07:59",
    "resolutionTime": "0:06:00",
    "firstResponseTime": "",
    "status": "CLOSED",
    "engineer": "ITSM NAC BNI",
    "remarks": "Support Troubleshoot"
  }
]
  ```
`

const chat = `[10.46, 27/8/2026] +62 898-8198-158: Name & NPP:Wiracayana Ratanaghara Jayamangala 116757
Hostname:
MAC Address:E8-BF-E1-A7-11-B5
IP Address:
Divisi: RDC
Department: Personal Channel Development (RDI)
Lokasi: Menara
Lantai: 
Kendala: Tidak bisa konek ke intranet
[10.46, 27/8/2026] ITSM NAC BNI: Terima kasih telah menghubungi ITSM Network Access Control BNI. Untuk keluhan terkait WIFI-INTRANET, mohon bantuannya mengisi data berikut:

Name & NPP:
Hostname:
MAC Address:
IP Address:
Divisi:
Department:
Lokasi:
Lantai:
Kendala:
[10.47, 27/8/2026] +62 898-8198-158: Name & NPP:Wiracayana Ratanaghara Jayamangala 116757
Hostname:
MAC Address:E8-BF-E1-A7-11-B5
IP Address:
Divisi: RDC
Department: Personal Channel Development (RDI)
Lokasi: Menara
Lantai: 
Kendala: Tidak bisa konek ke intranet
[10.47, 27/8/2026] +62 898-8198-158: Pagi mas tidak bisa konek intranet
[10.47, 27/8/2026] ITSM NAC BNI: pagi mas
[10.47, 27/8/2026] ITSM NAC BNI: untuk aplikasi clearpass nya sudah running mas?
[10.48, 27/8/2026] ITSM NAC BNI: boleh coba buka adss.bni.co.id dulu mas bisa login ga ya?
[10.49, 27/8/2026] +62 898-8198-158: Oke coba sy cek dlu
[10.54, 27/8/2026] ITSM NAC BNI: bisa login ke adss nya mas?
[10.54, 27/8/2026] +62 898-8198-158: Your account expired katanya
[10.55, 27/8/2026] ITSM NAC BNI: akun npp nya expired itu mas
[10.55, 27/8/2026] ITSM NAC BNI: perlu request untuk perpanjang
[10.56, 27/8/2026] +62 898-8198-158: 116757
[10.57, 27/8/2026] ITSM NAC BNI: bisa ke tim user ID ya mas
[10.58, 27/8/2026] ITSM NAC BNI: Mbak iin Tim User ID BNI
[10.59, 27/8/2026] +62 898-8198-158: Okee thanks mas
[11.04, 27/8/2026] ITSM NAC BNI: sama-sama mas
[07.53, 28/8/2026] +62 898-8198-158: selamat pagi mas
[07.53, 28/8/2026] +62 898-8198-158: Name & NPP:Wiracayana Ratanaghara Jayamangala 116757
Hostname:
MAC Address:E8-BF-E1-A7-11-B5
IP Address:
Divisi: RDC
Department: Personal Channel Development (RDI)
Lokasi: Menara
Lantai: 
Kendala: Tidak bisa konek ke intranet
[07.54, 28/8/2026] +62 898-8198-158: saya sudah connect ke intranet namun no internet
[07.57, 28/8/2026] ITSM NAC BNI: bisa di bantu reconnect kemudian capture ulang clearpass nya mas
[07.59, 28/8/2026] +62 898-8198-158: sudah bisa mas
[07.59, 28/8/2026] +62 898-8198-158: terima kasih
[07.59, 28/8/2026] ITSM NAC BNI: sama-sama mas`

const result = parseTickets(response, chat)
console.log(JSON.stringify(result.tickets.map(t => ({ no: t.no, firstResponseTime: t.firstResponseTime, resolutionTime: t.resolutionTime, taskStarted: t.taskStarted, taskFinished: t.taskFinished })), null, 2))
