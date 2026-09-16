# ITSM Timesheet Backend (Service Account Proxy)

Backend kecil yang membuat frontend tidak pernah perlu login Google. Semua panggilan ke Google Sheets API dilakukan di sini, memakai **Service Account**, bukan token OAuth milik user.

## Setup

1. **Buat Service Account** (sekali saja):
   - Buka [Google Cloud Console](https://console.cloud.google.com/) → pilih/buat project.
   - Enable **Google Sheets API** (APIs & Services → Library).
   - IAM & Admin → Service Accounts → **Create Service Account** (nama bebas, tidak perlu role project apa pun).
   - Buka service account yang baru dibuat → tab **Keys** → **Add Key** → **Create new key** → pilih **JSON** → download.

2. **Share spreadsheet ke Service Account**:
   - Buka Google Sheet tujuan → tombol **Share**.
   - Tambahkan email service account (ada di file JSON, field `client_email`, formatnya `nama@project-id.iam.gserviceaccount.com`).
   - Beri akses **Editor**.
   - Tanpa langkah ini, backend akan gagal dengan error 403 walau kredensial benar.

3. **Konfigurasi environment**:
   ```bash
   cp .env.example .env
   ```
   Isi:
   - `GOOGLE_CLIENT_EMAIL` — dari field `client_email` di file JSON.
   - `GOOGLE_PRIVATE_KEY` — dari field `private_key` di file JSON. Copy apa adanya (termasuk `\n` literal dan tanda kutip di sekelilingnya).
   - `BACKEND_API_KEY` — string rahasia bebas, contoh generate: `openssl rand -hex 32`. Nilai ini harus sama persis dengan `VITE_BACKEND_API_KEY` di `.env` root project (frontend).
   - `ALLOWED_ORIGINS` — origin frontend, contoh `http://localhost:5173` untuk dev, atau domain production saat deploy.
   - `PORT` — default `8787`.

4. **Install & jalankan**:
   ```bash
   npm install
   npm run dev     # auto-restart saat file berubah
   # atau
   npm start
   ```
   Cek `http://localhost:8787/health` → harus mengembalikan `{"ok":true}`.

## Endpoint

Semua endpoint `/api/sheets/*` wajib header `x-api-key: <BACKEND_API_KEY>`.

| Method | Path | Body/Query | Keterangan |
|---|---|---|---|
| GET | `/health` | - | Cek server hidup, tidak butuh API key. |
| GET | `/api/sheets/verify` | `?sheetId=` | Cek apakah spreadsheet bisa diakses. |
| GET | `/api/sheets/data` | `?sheetId=&sheetName=` | Ambil semua tiket dari sheet. |
| POST | `/api/sheets/append` | `{ sheetId, sheetName, tickets }` | Tambah tiket baru ke sheet. |

## Troubleshooting

| Masalah | Solusi |
|---|---|
| `Service account not configured` | `GOOGLE_CLIENT_EMAIL`/`GOOGLE_PRIVATE_KEY` kosong atau belum di-set di `.env`. |
| `error:1E08010C:DECODER routines::unsupported` | Format `GOOGLE_PRIVATE_KEY` salah — biasanya karena newline (`\n`) hilang atau ke-escape ganda. Copy ulang persis dari file JSON. |
| Response 403 dari Google saat verify/data/append | Spreadsheet belum di-share ke email service account sebagai Editor. |
| `Invalid or missing API key` | Header `x-api-key` dari frontend tidak cocok dengan `BACKEND_API_KEY`. |
| Frontend gagal connect (network error / CORS) | Pastikan backend berjalan, `VITE_BACKEND_URL` benar, dan origin frontend ada di `ALLOWED_ORIGINS`. |

## Deployment

Backend ini bisa dijalankan di layanan apa pun yang bisa jalankan Node.js (VPS, Railway, Render, Fly.io, dll). Yang penting:
- Set semua environment variable yang sama seperti di `.env`.
- Jangan expose `GOOGLE_PRIVATE_KEY` lewat log atau endpoint apa pun.
- Gunakan HTTPS di production, dan set `ALLOWED_ORIGINS` ke domain frontend production (bukan `*`).
