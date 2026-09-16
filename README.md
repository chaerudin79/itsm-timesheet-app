# ITSM NAC BNI Timesheet Analyzer

ITSM NAC BNI Timesheet Analyzer mengubah log percakapan WhatsApp menjadi tiket timesheet ITSM menggunakan AI, lalu membantu menyimpan, meninjau, mengimpor, dan mengekspor data tiket melalui Google Sheets.

## Fitur

- Analisis log WhatsApp dengan Groq AI.
- Ekstraksi tiket terstruktur dengan penomoran berurutan.
- Beberapa session analisis dengan penyimpanan lokal.
- Penyuntingan tiket langsung di tabel.
- Persetujuan dan sinkronisasi tiket ke Google Sheets.
- Import dan refresh data dari Google Sheets.
- Export tiket ke Excel atau CSV.
- Dashboard KPI, grafik, statistik, pencarian, filter, dan riwayat tiket.
- Dark mode, custom extraction rules, retry sync, dan indikator batas token.
- Tokenisasi nilai MAC address dan IP address sebelum data dikirim ke AI.

## Tech Stack

| Area | Teknologi |
|---|---|
| Frontend | React 18, Vite 5, React Router |
| Styling dan animasi | Tailwind CSS, Framer Motion |
| AI | Groq API |
| Authentication dan storage | Google Identity Services, Google Sheets API v4 |
| Export | SheetJS (`xlsx`) |
| UI dan chart | Lucide React, Recharts |

## Prasyarat

- Node.js 18 atau lebih baru.
- Akun Google dan akses ke Google Cloud Console.
- Groq API key dari [Groq Console](https://console.groq.com/keys).

## Instalasi

### 1. Clone dan install dependency

```bash
git clone https://github.com/chaerudin79/itsm-timesheet-app.git
cd itsm-timesheet-app
npm install
```

### 2. Buat file environment

Buat file `.env` di root project. Jangan commit file ini karena berisi credential.

```env
VITE_GROQ_API_KEY=gsk_your_key_here
VITE_GROQ_MODEL=openai/gpt-oss-120b
VITE_GROQ_TPM_LIMIT=8000
VITE_GROQ_MAX_OUTPUT_TOKENS=2000
VITE_GROQ_TPM_BUFFER=500
VITE_KIMI_API_KEY=your_kimi_key_here
VITE_KIMI_MODEL=kimi-k2.7-code-highspeed
VITE_KIMI_MAX_OUTPUT_TOKENS=32768
VITE_GOOGLE_SHEET_ID=your_google_sheet_id
VITE_BACKEND_URL=http://localhost:8787
VITE_BACKEND_API_KEY=same_value_as_server_BACKEND_API_KEY
```

| Variable | Keterangan |
|---|---|
| `VITE_GROQ_API_KEY` | API key untuk request ke Groq. |
| `VITE_GROQ_MODEL` | Model Groq yang digunakan. Dapat diganti sesuai model yang tersedia. |
| `VITE_GROQ_TPM_LIMIT` | Batas token per menit yang ditampilkan di UI. |
| `VITE_GROQ_MAX_OUTPUT_TOKENS` | Batas maksimum token output AI. |
| `VITE_GROQ_TPM_BUFFER` | Buffer token untuk indikator rate limit. |
| `VITE_KIMI_API_KEY` | API key Moonshot AI untuk analisis melalui Kimi. |
| `VITE_KIMI_MODEL` | Model Kimi, default `kimi-k2.7-code-highspeed`. |
| `VITE_KIMI_MAX_OUTPUT_TOKENS` | Batas output Kimi; gunakan `32768` untuk model K2.7 Code yang memakai reasoning. |
| `VITE_GOOGLE_SHEET_ID` | ID spreadsheet tujuan. |
| `VITE_BACKEND_URL` | URL backend proxy (lihat folder `server/`). Default `http://localhost:8787`. |
| `VITE_BACKEND_API_KEY` | Harus sama persis dengan `BACKEND_API_KEY` di `server/.env`. |

API key Groq juga dapat diatur dari halaman Settings dan disimpan di browser melalui `localStorage`. Access token Google tidak disimpan di `localStorage`; aplikasi hanya menyimpan metadata autentikasi yang diperlukan untuk sesi berikutnya.

### 3. Konfigurasi Google Sheets (Service Account, tanpa login popup)

Aplikasi ini sudah tidak memakai OAuth browser lagi. Sinkronisasi ke Google Sheets berjalan lewat backend kecil di folder `server/` yang login memakai **Service Account** — jadi tidak ada popup consent Google sama sekali, baik di run pertama maupun berikutnya.

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat atau pilih project, lalu enable **Google Sheets API**.
3. Buka **IAM & Admin → Service Accounts → Create Service Account**.
4. Setelah dibuat, buka tab **Keys → Add Key → Create new key → JSON**, lalu unduh file JSON-nya.
5. Buka spreadsheet tujuan, klik **Share**, lalu tambahkan alamat email service account (format `xxx@xxx.iam.gserviceaccount.com`, ada di file JSON) sebagai **Editor**.
6. Siapkan backend:

```bash
cd server
cp .env.example .env
npm install
```

7. Isi `server/.env`:
   - `GOOGLE_CLIENT_EMAIL` → nilai `client_email` dari file JSON.
   - `GOOGLE_PRIVATE_KEY` → nilai `private_key` dari file JSON (copy persis termasuk `\n`, jangan ubah).
   - `BACKEND_API_KEY` → string acak bebas (mis. `openssl rand -hex 32`), ini kunci rahasia antara frontend dan backend.
   - `ALLOWED_ORIGINS` → origin frontend, default `http://localhost:5173`.
8. Jalankan backend: `npm run dev` (dari dalam folder `server/`). Default di `http://localhost:8787`.
9. Di `.env` root project (frontend), isi `VITE_BACKEND_URL` dan `VITE_BACKEND_API_KEY` (harus sama dengan `BACKEND_API_KEY` di backend).

Detail troubleshooting Service Account ada di `server/README.md` dan bagian "Autentikasi Google Sheets" di bawah.

### 4. Jalankan aplikasi

```bash
npm run dev
```

Buka [http://localhost:5173](http://localhost:5173) di browser.

## Alur Penggunaan

1. Hubungkan Google Client ID dan Google Sheet ID, lalu berikan izin akses Google Sheets.
2. Buat session baru dari sidebar.
3. Tempel log WhatsApp pada halaman Analyzer.
4. Kirim log untuk diproses AI.
5. Periksa dan edit tiket pada tabel.
6. Setujui tiket untuk mengirimkannya ke Google Sheets.
7. Gunakan Import atau Refresh untuk mengambil data terbaru dari spreadsheet.
8. Gunakan Export untuk mengunduh data sebagai Excel atau CSV.

## Struktur Data Tiket

| Kolom | Keterangan |
|---|---|
| `No` | Nomor tiket berurutan. |
| `Source` | Sumber laporan, biasanya `WhatsApp`. |
| `Type` | `Problem`, `Service Request`, `Incident`, atau `Change Request`. |
| `Requester` | Lokasi atau user pelapor. |
| `Period` dan `Year` | Periode timesheet. |
| `Problem/Issue` | Deskripsi masalah dalam bahasa Inggris formal. |
| `Action` | Tindakan atau penyelesaian dalam bahasa Inggris formal. |
| `Date` | Tanggal tiket. |
| `Task Started` dan `Task Finished` | Waktu mulai dan selesai tugas. |
| `Resolution Time` | Durasi penyelesaian. |
| `Status` | Status tiket, misalnya `OPEN` atau `CLOSED`. |
| `Engineer` | Engineer yang menangani tiket. |
| `Remarks` | Catatan tambahan. |

## Autentikasi Google Sheets (Service Account via Backend)

Aplikasi ini **tidak lagi** memakai Google Identity Services / OAuth Implicit Flow di browser. Login admin ke dashboard tetap form statis (`admin` / `password`), dan sinkronisasi ke Google Sheets sepenuhnya ditangani oleh backend kecil di folder `server/` yang login sebagai **Service Account**.

### Cara kerja
1. Frontend memanggil endpoint backend (`/api/sheets/verify`, `/api/sheets/data`, `/api/sheets/append`) dengan header `x-api-key`, bukan memanggil Google Sheets API langsung.
2. Backend memvalidasi `x-api-key` terhadap `BACKEND_API_KEY`, lalu memakai kredensial Service Account (`GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`) untuk baca/tulis ke spreadsheet lewat `googleapis`.
3. Karena Service Account tidak pernah butuh persetujuan user, tidak ada popup consent, tidak ada token yang expired tiap 1 jam, dan tidak butuh `silentAuth`/refresh di frontend sama sekali.

### Keamanan
- `GOOGLE_PRIVATE_KEY` hanya pernah ada di server, tidak pernah dikirim ke browser.
- `BACKEND_API_KEY` mencegah orang lain memanggil backend selain dari frontend milikmu sendiri — jangan commit nilainya, dan gunakan HTTPS saat deploy ke publik.
- Spreadsheet harus di-share secara eksplisit (Editor) ke email Service Account; tanpa itu backend akan gagal read/write meski kredensial valid.

Lihat `server/README.md` untuk langkah setup lengkap dan troubleshooting.

## Batasan dan Catatan Keamanan

- Ketersediaan model dan rate limit Groq dapat berubah; periksa Groq Console jika model tidak dapat digunakan.
- Log yang terlalu panjang dapat ditolak API. Bagi log menjadi beberapa bagian dan analisis secara terpisah.
- Jangan menaruh API key atau credential langsung di source code.
- File `.env`, `node_modules`, dan `dist` diabaikan oleh Git melalui `.gitignore`.
- Karena aplikasi frontend memanggil layanan eksternal secara langsung, gunakan API key dengan batasan dan rotasi key bila diperlukan. Untuk deployment publik, pertimbangkan backend proxy.

## Struktur Project

```text
src/
├── App.jsx                 # Root app dan routing
├── components/             # Layout, tabel, modal, chat, dan widget UI
├── context/                # AuthContext (login admin + sheetId) dan SessionContext
├── hooks/                  # Analisis AI dan sinkronisasi Sheets
├── lib/                    # API client (googleSheetsApi.js -> backend), parser, tokenizer
├── pages/                  # Analyzer, Dashboard, History, dan Settings
├── styles/                 # Global CSS dan tema
└── utils/                  # Utilitas tanggal dan tiket

server/                     # Backend proxy: Service Account -> Google Sheets API
├── index.js                # Express app + endpoint /api/sheets/*
├── sheetsService.js        # Logic baca/tulis Sheets pakai googleapis
├── .env.example
└── package.json
```

## Script NPM

```bash
npm run dev       # Menjalankan development server
npm run build     # Membuat production build di dist/
npm run preview   # Meninjau production build secara lokal
```

## Production Build

```bash
npm run build
npm run preview
```

Untuk deployment, tambahkan domain production ke **Authorized JavaScript origins** Google Cloud Console dan sediakan environment variable yang sesuai pada platform hosting.

## Troubleshooting

| Masalah | Solusi |
|---|---|
| `401 Unauthorized` dari Groq | Periksa atau ganti `VITE_GROQ_API_KEY`. |
| Model tidak ditemukan | Atur `VITE_GROQ_MODEL` ke model aktif di Groq Console. |
| Request terlalu besar | Pecah log WhatsApp menjadi beberapa bagian. |
| Gagal sinkronisasi Sheets | Klik Retry Sync atau autentikasi Google kembali. |
| `401 Invalid or missing API key` dari backend | Pastikan `VITE_BACKEND_API_KEY` (frontend) sama persis dengan `BACKEND_API_KEY` (server). |
| Backend error `Service account not configured` | Isi `GOOGLE_CLIENT_EMAIL` dan `GOOGLE_PRIVATE_KEY` di `server/.env`. |
| Sheets API menolak akses (403) | Pastikan spreadsheet sudah di-share sebagai Editor ke email Service Account. |
| Frontend tidak bisa connect ke backend (CORS/refused) | Pastikan `npm run dev` di folder `server/` sedang berjalan dan `ALLOWED_ORIGINS` mencakup origin frontend. |
| Perubahan `.env` tidak terbaca | Restart development server setelah mengubah `.env`. |

## Kontribusi

1. Buat branch baru dari `main`.
2. Lakukan perubahan dan jalankan `npm run build`.
3. Buat commit dengan pesan yang jelas.
4. Push branch dan buat pull request.

## Lisensi

Internal use - ITSM NAC BNI Team.
