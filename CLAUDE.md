# CVMatch — CLAUDE.md

## What this is
AI-powered career coach for French students and young professionals.
Users paste their CV + a job offer; the AI reformats the CV to match the offer,
then they can chat with the AI coach about improvements.
UI and all copy are in French.

## Stack
- **Framework**: Next.js 13.5 (App Router), deployed on Vercel
- **Styling**: Tailwind CSS v3
- **AI**: Groq API (`groq-sdk`) — model `llama-3.3-70b-versatile`
- **Node requirement**: 16.17+ (local); Vercel uses Node 18 automatically
- **No auth, no database, no PDF** — plain text MVP only

## Project structure
```
cvmatch/
├── app/
│   ├── layout.js               — HTML shell, lang="fr", page metadata
│   ├── page.js                 — All client-side UI (single page, 'use client')
│   ├── globals.css             — Tailwind directives only
│   └── api/
│       ├── analyze/route.js    — POST: CV + offer → reformatted CV
│       └── chat/route.js       — POST: full context + messages → coach reply
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── .env.local.example
└── .gitignore
```

## Environment variables
| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Required. Set in `.env.local` locally, or in Vercel project settings. |

## What's been built (all 4 steps complete)

### Step 1 — Layout
Two side-by-side textareas (CV left, job offer right) + "Analyser" button below.

### Step 2 — CV Reformatting (`/api/analyze`)
On click, calls Claude with system prompt:
> "Tu es un expert RH senior... Réécris le CV pour qu'il corresponde parfaitement à l'offre..."

Displays reformatted CV in a monospaced result box below.

### Step 3 — Copy button
"Copier le CV" button next to the result box. Copies to clipboard, shows "Copié !" feedback for 2 s.

### Step 4 — Chat interface (`/api/chat`)
Chat UI appears below the result. Full context injected into system prompt:
original CV + job offer + reformatted CV. System prompt:
> "Tu es un expert RH direct et franc... Sois précis, honnête, sans flatterie inutile. Français uniquement."

Messages rendered as chat bubbles (user = indigo right, assistant = gray left).
Auto-scrolls to latest message.

## API routes

### `POST /api/analyze`
```json
Body:    { "cv": "...", "offer": "..." }
Returns: { "reformatted": "..." }
```

### `POST /api/chat`
```json
Body:    { "cv": "...", "offer": "...", "reformatted": "...", "messages": [{role, content}] }
Returns: { "reply": "..." }
```

## Running locally
```bash
cp .env.local.example .env.local
# fill in ANTHROPIC_API_KEY
npm install
npm run dev
# → http://localhost:3000
```

## Deploying to Vercel
1. Push repo to GitHub
2. Import into Vercel — Next.js detected automatically, no extra config
3. Add `ANTHROPIC_API_KEY` in Vercel project → Settings → Environment Variables
4. Deploy
