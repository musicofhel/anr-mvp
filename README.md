# A&R MVP — Record Label Simulator

**The stripped version.** No backend. No Spotify. No prediction market.  
One question to answer: *Will people generate AI bands and review each other's work?*

## What's in

- Magic link auth (no passwords)
- Name your label, pick a genre
- Submit bands by pasting a Suno share link
- Review queue — listen, rate 1-10, earn royalties
- Leaderboard ranked by avg rating
- Energy system: 3 free bands, earn more by reviewing

## What's deliberately out

- FastAPI backend (Supabase handles everything)
- Suno API integration (users paste links)
- Signing/prediction market (Phase 2, after validation)
- Label tiers, transactions, Spotify distribution
- Anything that doesn't answer the core question

## Stack

- React 18 + Vite + TypeScript
- TailwindCSS
- Supabase (Auth + Postgres + RLS + Edge Functions)
- Vercel (deploy)

## Setup

### 1. Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → paste `supabase/migrations/001_mvp_schema.sql` → Run
3. Go to Authentication → Providers → enable Email (magic link)
4. Copy your project URL and anon key

### 2. Local dev

```bash
npm install
cp .env.example .env.local   # fill in Supabase creds
npm run dev                   # http://localhost:5173
```

### 3. Deploy to Vercel

```bash
npm i -g vercel
vercel
# Set env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
vercel --prod
```

### 4. Seed the review queue

Generate 15-20 bands on [suno.com](https://suno.com) yourself.  
Submit them under a house label so the queue isn't empty on launch day.

## Success metrics (Week 1)

- 50 signups
- 20 people who review at least 1 band
- 5 people who review 5+ bands in one session ← **this is the signal**
- Day 3 retention > 15%
