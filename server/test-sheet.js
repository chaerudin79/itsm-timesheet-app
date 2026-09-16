import 'dotenv/config'
import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const email = process.env.GOOGLE_CLIENT_EMAIL
let key = process.env.GOOGLE_PRIVATE_KEY
key = key.replace(/\\n/g, '\n')

const auth = new google.auth.JWT({
  email,
  key,
  scopes: SCOPES
})
const sheets = google.sheets({ version: 'v4', auth })

const sheetId = '1t_LXPuAvB40zi0SjzzQp9SdVVSI5HW_1mVezhx29l7w'

async function test() {
  try {
    await auth.authorize();
    const res = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
    console.log(res.data.sheets.map(s => ({ title: s.properties.title, sheetId: s.properties.sheetId })))
  } catch (err) {
    console.error(err.message)
  }
}

test()