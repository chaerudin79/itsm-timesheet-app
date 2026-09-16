import 'dotenv/config'
const k = process.env.GOOGLE_PRIVATE_KEY || ''
console.log('Includes literal slash-n:', k.includes('\\n'))
console.log('Includes actual newline:', k.includes('\n'))
