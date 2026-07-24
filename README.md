# 📚 Vokabeltrainer — Flashcards

A small React app for learning vocabulary with a six-phase spaced-repetition
system. You store German words together with a translation in any language,
review the ones due today, and cards climb through phases as you get them right.

- **Login** with a predefined username / password.
- **Add vocabularies**, each with the language it should be asked in.
- **Six phases** with growing review intervals (see below).
- **Home** shows exactly what's due today; unfinished cards stay due.
- **Self-graded review**: German is shown, you recall the translation, flip the
  card, and mark yourself correct or wrong.
- Data is stored in **Supabase**, so it syncs across devices.

## How the spaced repetition works

Every card sits in one of six phases. Getting a card right moves it up one phase
(capped at 6) and schedules it further into the future. Getting it wrong sends it
straight back to phase 1 and makes it due again today.

| Phase | Shown        |
| ----- | ------------ |
| 1     | every day    |
| 2     | every 3 days |
| 3     | every 7 days |
| 4     | every 14 days |
| 5     | every 30 days |
| 6     | every 90 days |

Intervals live in `src/lib/srs.ts` (`PHASE_INTERVALS_DAYS`) if you want to tweak them.

## Getting started

### 1. Install

```bash
npm install
```

### 2. Set up Supabase (free tier)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
3. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_APP_USERNAME=admin
VITE_APP_PASSWORD=lernen
```

### 4. Run

```bash
npm run dev
```

Open the printed URL and sign in with the username / password you set.

## Deploying (cheapest option: Vercel free tier)

1. Push this repo to GitHub.
2. In Vercel, **New Project → Import** the repo. Framework preset **Vite** is
   detected automatically (`vercel.json` is included).
3. Add the four environment variables from your `.env` under
   **Settings → Environment Variables**.
4. Deploy. Vercel's Hobby plan and Supabase's free tier are both $0.

> Render works too: create a **Static Site**, build command `npm run build`,
> publish directory `dist`, and add the same environment variables.

## A note on security

The login is a lightweight gate for a single-user personal app, and the app talks
to Supabase with the public anon key. Anyone with the anon key could read/write
the `cards` table. That's an acceptable trade-off for a personal project; for a
real security boundary, switch to Supabase Auth and scope rows to `auth.uid()`.

## Tech

React 18 · TypeScript · Vite · Supabase. No CSS framework — styling lives in
`src/styles.css`.
