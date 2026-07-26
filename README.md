# 📚 Vokabeltrainer — Flashcards

A small React app for learning vocabulary with a six-phase spaced-repetition
system. You store German words together with a translation in any language,
review the ones due today, and cards climb through phases as you get them right.

- **Login** with a predefined username / password.
- **Add vocabularies** one at a time, or **import many at once** from an Excel
  (`.xlsx`) or `.csv` file. Columns: German, Translation, and optionally Language
  (a header row is optional); a downloadable template is provided in the app.
- **Six phases** with growing review intervals (see below).
- **Home** shows exactly what's due today; unfinished cards stay due.
- **Self-graded review**: German is shown, you recall the translation, flip the
  card, and mark yourself correct or wrong. A session keeps cycling through the
  due cards until every one is answered correctly — a card you get wrong drops to
  phase 1 and keeps coming back in the same session until you nail it.
- Three ways to study:
  - **Today's review** — the daily spaced-repetition queue (home screen).
  - **Learn by phase** — pick a phase on the home screen and drill every card in
    it; answers still count (correct → up a phase, wrong → back to phase 1).
  - **Practice** — group cards into named **categories** (or an ad-hoc selection)
    and flip through them in random order with no grading, until you exit.
- **Manual phase move**: on the Cards screen, each card has a phase selector to
  move it to any phase (its next-due date is rescheduled to match).
- **Activation gate**: new and imported cards start **inactive** so a big import
  doesn't flood your daily review. On the Cards screen you activate cards — one at
  a time or in batches ("Activate next N") — and activating a card is what puts it
  into phase 1 (due today). Only active cards appear in Today's review and
  Learn-by-phase.
- Data is stored in **Supabase**, so it syncs across devices.

## How the spaced repetition works

Every card sits in one of six phases. Getting a card right on the first try moves it up one phase (capped at 6) and
schedules it further into the future. Getting it wrong sends it straight back to
phase 1 and keeps it in today's session until you answer it correctly; once you
do, it stays in phase 1 and returns the next day rather than jumping ahead.

| Phase | Shown         |
| ----- | ------------- |
| 1     | same day      |
| 2     | after 1 day   |
| 3     | after 3 days  |
| 4     | after 9 days  |
| 5     | after 29 days |
| 6     | after 90 days |

Phase 1 is same-day: new and just-failed cards stay due today and are drilled
again until you answer them correctly, at which point they graduate to phase 2
and return the next day.

Intervals live in `src/lib/srs.ts` (`PHASE_INTERVALS_DAYS`) if you want to tweak them.

## Getting started

### 1. Install

```bash
npm install
```

### 2. Set up Supabase (free tier)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
   This creates both the `cards` and `categories` tables. If you set the project
   up before categories existed, just run the `categories` block from that file
   once to enable the Practice feature.
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
