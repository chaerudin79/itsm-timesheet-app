# ITSM NAC BNI Timesheet Analyzer

A web application for analyzing WhatsApp chat logs from NAC BNI and automatically generating ITSM timesheet tickets, then saving them to Google Sheets.

---

## Key Features

- **WhatsApp Chat Analysis** — Paste chat logs; AI automatically extracts ITSM tickets
- **Multi-Session Management** — Manage multiple analysis sessions with sidebar
- **Sequential Numbering** — Ticket numbers automatically increment across chats within a session
- **Inline Editing** — Click table cells to edit tickets directly in the UI
- **Google Sheets Sync** — Tickets automatically sent to spreadsheet after analysis
- **Export** — Download tickets as Excel/CSV files
- **Dark Mode** — Toggle between dark and light themes
- **Custom Rules** — Add custom extraction rules per session
- **Auto Re-auth** — Google OAuth tokens automatically refreshed when expired (1 hour)
- **Auto-import from Sheets** — Automatically load existing tickets from Google Sheets on startup
- **Manual Import** — Button to import new manually-entered tickets from Sheets
- **Real-time Refresh** — Refresh button to fetch latest data from Google Sheets

---

## Tech Stack

| Layer | Library / Service |
|---|---|
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 + Framer Motion |
| AI / LLM | Groq API (`openai/gpt-oss-120b` by default) |
| Auth | Google Identity Services (GIS) OAuth 2.0 Implicit Flow |
| Storage | Google Sheets API v4 (direct REST) |
| Export | SheetJS (xlsx) |
| Icons | Lucide React |
| Charts | Recharts |

---

## Prerequisites

- Node.js >= 18
- Google account with access to Google Cloud Console
- Groq API Key (free at https://console.groq.com)


---

## Setup

### 1. Clone & Install

```bash
cd itsm-timesheet-app
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_GROQ_MODEL=openai/gpt-oss-120b
VITE_GROQ_TPM_LIMIT=250000
VITE_GOOGLE_CLIENT_ID=xxxxxxxxxx.apps.googleusercontent.com
VITE_GOOGLE_SHEET_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

| Variable | Description |
|---|---|
| `VITE_GROQ_API_KEY` | API key from https://console.groq.com/keys |
| `VITE_GROQ_MODEL` | Optional Groq model ID. Defaults to `openai/gpt-oss-120b` |
| `VITE_GROQ_TPM_LIMIT` | Optional display limit for the rate-limit indicator |
| `VITE_GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console |
| `VITE_GOOGLE_SHEET_ID` | Target Google Spreadsheet ID (from sheet URL) |

> The Groq API key can also be entered and overridden at runtime via the Settings page — it will be saved to `localStorage` under the key `groqApiKey`.

### 3. Google OAuth Setup

1. Open Google Cloud Console → **APIs & Services** → **Credentials**
2. Create **OAuth 2.0 Client ID** → select **Web application**
3. Add Authorized JavaScript origins:
   ```
   http://localhost:5173
   ```
4. Enable **Google Sheets API** in the library

> **Note:** Port must be `5173`. Vite is configured with `strictPort: true` to prevent port changes that would break OAuth redirect.

### 4. Run Dev Server

```bash
npm run dev
```

Open browser to `http://localhost:5173`



## Usage Guide

1. **Login** — On first open, enter Google Client ID and Sheet ID, then click **Connect**. Browser will request Google Sheets permissions.
2. **Create Session** — Click the `+` button in sidebar to create a new analysis session.
3. **Paste Chat** — Copy WhatsApp chat log into the input field, then press Enter or click Send.
4. **Review Tickets** — AI generates a ticket table. Click cells to edit inline.
5. **Approve & Sync** — Approve tickets to sync them to Google Sheets. If it fails, a **Retry Sync** banner appears.
6. **Import** — Click **Import** button to fetch manually-entered tickets from Google Sheets.
7. **Refresh** — Click **Refresh** button to sync latest data from Sheets to dashboard.
8. **Export** — Click **Export** button above the table to download Excel/CSV.

---

## Ticket Column Structure

| Column | Description |
|---|---|
| No | Sequential ticket number (continues across chats within a session) |
| Source | Report source (`WhatsApp`) |
| Type | `Problem` / `Request Task` / `Change Request` |
| Requester | Location/user (e.g., `User - Menara BNI`) |
| Period | Month in English (e.g., `June`) |
| Year | Year |
| Problem/Issue | Problem description — formal English |
| Action | Action taken — formal English |
| Date | Date (format `M/D/YYYY`) |
| Task Started | Start time (format `M/D/YYYY H:MM`) |
| Task Finished | End time (format `M/D/YYYY H:MM`) |
| Resolution Time | Resolution duration (`H:MM:SS`) |
| Status | `CLOSED` / `OPEN` |
| Engineer | Default: `ITSM NAC BNI` |
| Remarks | Additional notes |

---

## Site Mapping

| Chat Name | Ticket Requester |
|---|---|
| Menara BNI | User - Menara BNI |
| Plaza BNI | User - Plaza BNI |
| Citicon | User - BNI Citicon |
| Grha BNI | User - Grha BNI |
| RDTX | User - BNI RDTX |

---

## Groq Free Tier Limitations

Groq model availability and limits can change. This app defaults to `openai/gpt-oss-120b`, and you can override it with `VITE_GROQ_MODEL` in `.env`.

- Chat logs > 15,000 characters are rejected before sending to API.
- **Solution:** Split long chat logs into multiple parts and analyze each part separately.
- Check your current Groq model limits in the Groq Console.

---

## File Structure

```
itsm-timesheet-app/
├── src/
│   ├── App.jsx                       # Root app, routing, provider tree
│   ├── components/
│   │   ├── ModernAppLayout.jsx        # App shell: sidebar nav, dark mode
│   │   ├── ModernHeader.jsx           # Top header bar
│   │   ├── ModernDataTable.jsx        # Ticket data table
│   │   ├── ModernKPICard.jsx          # KPI summary card
│   │   ├── ChatInput.jsx              # Chat input area
│   │   ├── MessageList.jsx            # Chat message list
│   │   ├── MessageBubble.jsx          # Individual message + ticket table
│   │   ├── TicketTable.jsx            # Ticket table with inline editing
│   │   ├── TicketStats.jsx            # Ticket summary statistics
│   │   ├── GoogleSheetsModal.jsx      # Initial connection setup form
│   │   ├── GoogleSheetsStatus.jsx     # Sync status indicator
│   │   ├── ImportFromSheetsModal.jsx  # Import from Sheets dialog
│   │   ├── ExportModal.jsx            # Export as Excel/CSV modal
│   │   ├── SettingsModal.jsx          # Custom rules & API key settings
│   │   ├── RateLimitIndicator.jsx     # Groq rate limit display
│   │   ├── ErrorBoundary.jsx          # React error boundary
│   │   ├── SkeletonLoader.jsx         # Loading skeleton
│   │   └── LoadingDots.jsx            # Loading animation
│   ├── lib/
│   │   ├── groqApi.js                 # Groq API client (LLM)
│   │   ├── googleAuth.js              # Google OAuth (GIS)
│   │   ├── googleSheetsApi.js         # Google Sheets API v4 (direct REST)
│   │   ├── systemPrompt.js            # System prompt for ITSM NAC BNI
│   │   ├── ticketParser.js            # Parse JSON tickets from LLM response
│   │   ├── ticketOperations.js        # Ticket batch ops (export, delete, duplicate)
│   │   ├── tokenizer.js               # MAC/IP tokenizer for privacy
│   │   └── storageUtils.js            # localStorage wrapper with validation
│   ├── hooks/
│   │   ├── useAnalysis.js             # Main AI analysis + Sheets sync hook
│   │   └── useSheetsSync.js           # Sheets import/audit/sync hook
│   ├── context/
│   │   ├── AuthContext.jsx            # Google auth, sheet ID, dark mode, custom rules
│   │   └── SessionContext.jsx         # Sessions and tickets state
│   ├── pages/
│   │   ├── ModernAnalyzerPage.jsx     # Chat analysis page
│   │   ├── ModernDashboardPage.jsx    # Dashboard with KPIs and charts
│   │   ├── ModernHistoryPage.jsx      # Ticket history with filters
│   │   └── ModernSettingsPage.jsx     # Settings page
│   ├── utils/
│   │   ├── dateUtils.js               # Date utilities
│   │   └── ticketUtils.js             # Ticket filter, sort, stats utilities
│   └── styles/
│       └── index.css                  # Global styles (dark mode, glassmorphism)
├── .env                               # Environment variables (do not commit!)
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## Production Build

```bash
npm run build
```

Output is in the `dist/` folder. Can be hosted on Nginx, Apache, or static hosting services.

> **Important:** Add production domain to **Authorized JavaScript origins** in Google Cloud Console before deploying.

---

## Troubleshooting

| Error | Cause | Solution |
|---|---|---|
| `401 Unauthorized` | Groq API key invalid/expired | Check `VITE_GROQ_API_KEY` in `.env` or update via Settings page |
| `404 model does not exist or you do not have access` | Groq model ID is deprecated, unavailable, or not enabled for your account | Set `VITE_GROQ_MODEL=openai/gpt-oss-120b` or another active model from Groq Console |
| `413 Request too large` | Chat log too long | Split chat log into multiple parts and analyze separately |
| `Failed to sync to Google Sheets` | OAuth token expired | Click **Retry Sync**; browser will request permissions again |
| Port is not 5173 | Port conflict | Close other applications using port 5173 |
| `Google Client ID not configured` | `.env` missing or incorrect | Check `VITE_GOOGLE_CLIENT_ID` in `.env` |
---

## License

Internal use — ITSM NAC BNI Team.
