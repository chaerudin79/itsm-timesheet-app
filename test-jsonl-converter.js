import { convertJsonlToWhatsApp, isJsonlFormat } from './src/lib/jsonlConverter.js'

const realSample = `{"ts":1789024021,"iso":"2026-09-10T07:07:01.000Z","jid":"76965914615932@lid","chat_name":"Raynaldo","sender":"76965914615932","sender_name":"Raynaldo","from_me":false,"type":"text","text":"Mas/mba gimana, apakah sudah di proses"}
{"ts":1789024026,"iso":"2026-09-10T07:07:06.000Z","jid":"76965914615932@lid","chat_name":"Raynaldo","sender":"6285121341851","sender_name":"ITSM NAC BNI","from_me":true,"type":"text","text":"Halo Rekan BNI"}`

console.log('=== Real Sample Test ===')
console.log('ISO: 2026-09-10T07:07:01.000Z')
console.log('Expected: 10 September 2026, 14:07 WIB')
console.log('')

const converted = convertJsonlToWhatsApp(realSample)
console.log(converted)

