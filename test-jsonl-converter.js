import { convertJsonlToWhatsApp, isJsonlFormat } from './src/lib/jsonlConverter.js'

const sampleJsonl = `{"ts":1788857171,"iso":"2026-09-08T08:46:11.000Z","jid":"26444281466988@lid","chat_name":null,"sender":"6285121341851","sender_name":"ITSM NAC BNI","from_me":true,"type":"text","text":"siang mas"}
{"ts":1788857200,"iso":"2026-09-08T08:46:40.000Z","jid":"26444281466988@lid","chat_name":null,"sender":"6285121341851","sender_name":"ITSM NAC BNI","from_me":true,"type":"text","text":"mas ini perlu di install aplikasi trellix nya"}
{"ts":1788857205,"iso":"2026-09-08T08:46:45.000Z","jid":"26444281466988@lid","chat_name":null,"sender":"6285121341851","sender_name":"ITSM NAC BNI","from_me":true,"type":"text","text":"bisa hubungi tim desktop ya"}
{"ts":1788857264,"iso":"2026-09-08T08:47:44.000Z","jid":"26444281466988@lid","chat_name":"Badra","sender":"26444281466988","sender_name":"Badra","from_me":false,"type":"text","text":"oke kak saya langsung kasih keterangan data diri ke sana ya"}
{"ts":1788857608,"iso":"2026-09-08T08:53:28.000Z","jid":"26444281466988@lid","chat_name":"Badra","sender":"26444281466988","sender_name":"Badra","from_me":false,"type":"text","text":"terimakasih kak"}`

const sampleRawChat = `[10.42, 2/7/2026] ITSM NAC BNI: siang mas
[10.43, 2/7/2026] ITSM NAC BNI: mas ini perlu whitelist`

console.log('=== Test JSONL Detection ===')
console.log('Is JSONL?', isJsonlFormat(sampleJsonl))
console.log('Is Raw Chat JSONL?', isJsonlFormat(sampleRawChat))

console.log('\n=== Test JSONL Conversion ===')
const converted = convertJsonlToWhatsApp(sampleJsonl)
console.log(converted)

console.log('\n=== Test Raw Chat (should pass through) ===')
const passthrough = convertJsonlToWhatsApp(sampleRawChat)
console.log(passthrough)
