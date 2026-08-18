<div align="center">
  <img src="assets/icon128.png" alt="ApplyOnce logo" width="128" height="128" />
  <h1>ApplyOnce</h1>
  <p><strong>A privacy-first, AI-powered Chrome extension that autofills job applications.</strong></p>
  <p><a href="#installation">Installation</a> • <a href="#tech-stack">Tech stack</a> • <a href="#setup">Setup</a></p>
</div>

## What is ApplyOnce?
ApplyOnce is a Manifest V3 Chrome extension plus a Next.js dashboard that autofills job
applications from your saved profile and resume, with AI assistance for open-ended questions.
It fills forms for you to review — it never submits anything automatically.

## Features
- **Fast autofill:** Matches profile details to standard and custom application fields.
- **AI-assisted answers:** Uses your locally configured Gemini or Groq key for complex questions.
- **Privacy first:** AI keys stay in browser local storage and are never sent to the web app.
- **Cloud sync:** Keeps your dashboard profile and resume available to the extension.
- **Resume parsing:** Extracts structured profile details from text-based PDF resumes.
- **Review before submission:** ApplyOnce fills forms but never submits them automatically.

## Tech stack
- **Web dashboard:** Next.js (App Router) + React + Tailwind CSS
- **Backend / data:** Supabase (Postgres, Auth, Row Level Security)
- **AI:** Google Gemini (with a Groq fallback provider), keys stored locally in the browser
- **Extension:** Chrome Manifest V3 (background service worker, content scripts, side panel, options page)

## Architecture
```text
Web dashboard ─ sign in, profile form, resume upload
       │
       ▼
Supabase (Postgres) ─ profile and resume storage
       ▲
       │ profile sync
Browser extension ─ matching, local AI calls, autofill
```

## Installation
> **Note:** ApplyOnce is **not published on the Chrome Web Store**. It is a **local install only** —
> load it as an unpacked extension in developer mode.

1. Clone or download this project.
2. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
3. Select the project root (the folder containing `manifest.json`).
4. Open the ApplyOnce extension and sign in.
5. Build your profile in the dashboard and add an AI provider key in extension settings.
6. Open a job application, choose **Autofill**, and review every answer before submitting.

## Setup
### 1. Configure the database (Supabase)
1. Create a Supabase project.
2. In the Supabase SQL editor, run the schema in [`web/supabase-setup.sql`](web/supabase-setup.sql)
   to create the required tables and Row Level Security policies.

### 2. Configure environment variables
Copy the example file and fill in your own values:
```bash
cd web
cp .env.example .env.local
```
`.env.local` is ignored by Git and must never be committed. The app reads these variable **names**
(values come from your own Supabase project and local extension ID):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (public by design) |
| `NEXT_PUBLIC_EXTENSION_ID` | Chrome extension ID used to connect the web app to the extension |

### 3. Run the web app
```bash
cd web
npm install
npm run dev
```
Then open `http://localhost:3000`.

## Creator
ApplyOnce is made by **Surya Pratap Singh**.
