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
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
VITE_GOOGLE_SHEET_ID=your_google_sheet_id
```

| Variable | Keterangan |
|---|---|
| `VITE_GROQ_API_KEY` | API key untuk request ke Groq. |
| `VITE_GROQ_MODEL` | Model Groq yang digunakan. Dapat diganti sesuai model yang tersedia. |
| `VITE_GROQ_TPM_LIMIT` | Batas token per menit yang ditampilkan di UI. |
| `VITE_GROQ_MAX_OUTPUT_TOKENS` | Batas maksimum token output AI. |
| `VITE_GROQ_TPM_BUFFER` | Buffer token untuk indikator rate limit. |
| `VITE_GOOGLE_CLIENT_ID` | OAuth Client ID untuk aplikasi web. |
| `VITE_GOOGLE_SHEET_ID` | ID spreadsheet tujuan. |

API key Groq juga dapat diatur dari halaman Settings dan disimpan di browser melalui `localStorage`. Access token Google tidak disimpan di `localStorage`; aplikasi hanya menyimpan metadata autentikasi yang diperlukan untuk sesi berikutnya.

### 3. Konfigurasi Google Sheets

1. Buka Google Cloud Console.
2. Buat atau pilih project.
3. Enable **Google Sheets API**.
4. Buat **OAuth 2.0 Client ID** dengan tipe **Web application**.
5. Tambahkan origin berikut ke **Authorized JavaScript origins**:

```text
http://localhost:5173
```

6. Pastikan akun Google yang digunakan memiliki akses edit ke spreadsheet tujuan.

> Vite menggunakan port `5173` secara strict. Port ini harus sama dengan origin OAuth yang didaftarkan.

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
├── context/                # AuthContext dan SessionContext
├── hooks/                  # Analisis AI dan sinkronisasi Sheets
├── lib/                    # API client, parser, tokenizer, dan operasi tiket
├── pages/                  # Analyzer, Dashboard, History, dan Settings
├── styles/                 # Global CSS dan tema
└── utils/                  # Utilitas tanggal dan tiket
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
| Client ID tidak dikonfigurasi | Periksa `VITE_GOOGLE_CLIENT_ID` dan restart Vite. |
| OAuth gagal di localhost | Pastikan origin `http://localhost:5173` sudah terdaftar. |
| Perubahan `.env` tidak terbaca | Restart development server setelah mengubah `.env`. |

## Kontribusi

1. Buat branch baru dari `main`.
2. Lakukan perubahan dan jalankan `npm run build`.
3. Buat commit dengan pesan yang jelas.
4. Push branch dan buat pull request.

## Lisensi

Internal use - ITSM NAC BNI Team.
