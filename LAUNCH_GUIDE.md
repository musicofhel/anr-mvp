# A&R MVP — Launch Guide

Step-by-step from zero to live. Estimated time: 3-5 hours for first working
deploy, assuming moderate comfort with React and SQL.

---

## Phase 1: Supabase Setup (30 min)

### 1.1 Create the project
- Go to [supabase.com](https://supabase.com) → New Project
- Pick a name, set a database password (save it), choose a region close to you
- Wait ~2 min for provisioning

### 1.2 Run the migration
- Go to **SQL Editor** in the left sidebar
- Click **New Query**
- Paste the ENTIRE contents of `supabase/migrations/001_mvp_schema.sql`
- Click **Run**

**⚠️ Likely issue:** If you see `"relation auth.users does not exist"`, you're
on an older Supabase version. This shouldn't happen on new projects but if it
does, just wait 30 seconds and re-run — auth tables are created async.

**⚠️ Likely issue:** If you see `"type genre_type already exists"`, you ran it
twice. Run this first to clean up, then re-run the full migration:

```sql
drop table if exists public.reviews cascade;
drop table if exists public.tracks cascade;
drop table if exists public.bands cascade;
drop table if exists public.labels cascade;
drop table if exists public.profiles cascade;
drop type if exists genre_type cascade;
drop function if exists public.handle_new_review cascade;
drop function if exists public.handle_new_band cascade;
drop function if exists public.get_review_queue cascade;
drop function if exists public.buy_energy cascade;
```

### 1.3 Verify tables exist
- Go to **Table Editor** in the left sidebar
- You should see: profiles, labels, bands, tracks, reviews
- If they're all there, the migration worked

### 1.4 Enable Magic Link auth
- Go to **Authentication** → **Providers** → **Email**
- Make sure "Enable Email" is ON
- "Confirm email" can stay ON (magic link handles this)
- Under **URL Configuration** (Authentication → URL Configuration):
  - Set **Site URL** to `http://localhost:5173` (for dev)
  - Add `http://localhost:5173` to **Redirect URLs**
  - Later, add your Vercel URL to both when you deploy

### 1.5 Grab your keys
- Go to **Settings** → **API**
- Copy **Project URL** (looks like `https://abcdefg.supabase.co`)
- Copy **anon / public** key (the long one starting with `eyJ...`)
- You do NOT need the service_role key for the MVP

---

## Phase 2: Local Dev Setup (20 min)

### 2.1 Install dependencies

```bash
cd anr-mvp
npm install
```

**⚠️ Likely issue:** If you see peer dependency warnings, that's fine — ignore
them. If you see actual errors, try `npm install --legacy-peer-deps`.

### 2.2 Create your env file

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-long-key
```

**⚠️ Common mistake:** The file MUST be `.env.local` not `.env`. Vite only
auto-loads `.env.local` in dev mode.

### 2.3 Start the dev server

```bash
npm run dev
```

You should see:

```
  VITE v6.x.x  ready in 300ms

  ➜  Local:   http://localhost:5173/
```

**⚠️ If you see `"Missing VITE_SUPABASE_URL"` error:** Your env file isn't
being loaded. Check:
- File is named `.env.local` (not `.env`)
- No spaces around the `=` signs
- Restart the dev server after changing env vars

---

## Phase 3: First Run Testing (1-2 hours)

This is where you'll hit the real bugs. Here's the order to test, and what
might go wrong at each step.

### 3.1 Magic Link Login
- Open `http://localhost:5173`
- You should see the A&R login screen
- Enter your email, click "Send magic link"
- Check your email (also check spam)
- Click the link

**⚠️ Likely issue:** The magic link redirects to the wrong URL. Fix:
- In Supabase dashboard → Authentication → URL Configuration
- Site URL must be `http://localhost:5173`
- Redirect URLs must include `http://localhost:5173`

**⚠️ Likely issue:** Magic link email never arrives. Check:
- Supabase free tier has email rate limits (4 per hour)
- Check spam folder
- In Supabase dashboard → Authentication → Users, check if the user was created
- Alternative: temporarily enable email/password auth for faster testing

### 3.2 Onboarding
- After clicking the magic link, you should land on "Who are you?" screen
- Enter a username → Next → Enter a label name → Launch label

**⚠️ Likely issue:** "new row violates row-level security policy". This means
the RLS policy for profiles or labels isn't matching the auth user. Check:
- In Supabase → Authentication → Users, verify the user exists
- In SQL Editor run: `select * from auth.users;` — grab the user id
- Compare with what the insert is sending

**⚠️ Likely issue:** After creating the label, the page doesn't update. The
`refreshLabel` callback in useAuth has a dependency issue. If this happens:
- Hard refresh the page (Cmd+R / F5) — if your label shows up after refresh,
  the issue is the React state, not the database
- Fix: in `src/hooks/useAuth.tsx`, the `refreshLabel` useCallback depends on
  `label` state which can be stale. If this bites you, simplify it:

```tsx
const refreshLabel = useCallback(async () => {
  const l = await getMyLabel().catch(() => null);
  if (l) setLabel(l);
}, []);  // no dependencies — always fetches fresh
```

### 3.3 Submit a Band
- Click "Submit a band" or navigate to /submit
- Fill in band name, genre, paste any URL for the Suno link
- Add track titles (optional)
- Click submit

**⚠️ Likely issue:** "Not enough energy" even though you have 3. This means
the BEFORE INSERT trigger is rejecting. Check:
- In Supabase → Table Editor → labels, verify your label has energy > 0
- In SQL Editor: `select id, energy from labels;`

**⚠️ Likely issue:** Band is created but tracks fail silently. This is a
non-critical bug — the band still appears without track titles. The track
inserts are sequential and if one fails the rest won't run. Check browser
console for errors.

### 3.4 Review Queue
- Navigate to /review
- You need at least one OTHER user's band in the queue

**This is the chicken-and-egg problem.** For testing, you need to seed data.
Easiest way: use the SQL Editor to insert a test band directly:

```sql
-- First, get your label id
select id from labels;

-- Insert a fake "other" label and band for testing
insert into profiles (id, username) values
  ('00000000-0000-0000-0000-000000000001', 'test_label_user');

insert into labels (id, owner_id, name, specialty, energy, royalties) values
  ('00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Test Records', 'indie', 99, 0);

insert into bands (creator_id, name, genre, suno_url, is_submitted, submitted_at) values
  ('00000000-0000-0000-0000-000000000002',
   'The Neon Echoes', 'electronic',
   'https://suno.com/song/example',
   true, now()),
  ('00000000-0000-0000-0000-000000000002',
   'Velvet Mirage', 'indie',
   'https://suno.com/song/example2',
   true, now()),
  ('00000000-0000-0000-0000-000000000002',
   'Crystal Drift', 'ambient',
   'https://suno.com/song/example3',
   true, now());
```

**Note:** These test inserts bypass RLS because you're running them as the
database admin in the SQL Editor. They won't trigger the energy deduction
trigger in the same way (the profile doesn't have a real auth user). This is
fine for testing — real users will go through the normal flow.

### 3.5 Submit a Review
- With test bands in the queue, you should see one on /review
- Rate it 1-10, add notes, click Submit
- You should see "+5 royalties" flash
- Your royalty count in the nav should update

**⚠️ Likely issue:** Royalties don't update in the nav after reviewing. This
means `refreshLabel` didn't fire or didn't propagate. Check browser console
for errors. Quick fix: navigate away and back — if the nav updates, it's a
React re-render issue, not a database issue.

### 3.6 Buy Energy
- After 2 reviews (10 royalties), go to /submit
- If energy is 0, you should see "Buy 1 energy (10 royalties)"
- Click it — energy should go up, royalties should go down

### 3.7 Leaderboard
- Navigate to /leaderboard
- Your test bands should appear, ranked by avg_rating
- Try the genre filter

**⚠️ Likely issue:** Bands show but the creator label name is missing. This
means the `labels(name)` join syntax isn't being recognized. Try changing it
in `src/lib/db.ts` to the explicit form:

```ts
.select('*, labels!bands_creator_id_fkey(name)', { count: 'exact' })
```

If that doesn't work either, check Supabase → API Docs → bands to see how
it names the foreign key relationship.

---

## Phase 4: Deploy to Vercel (15 min)

### 4.1 Push to GitHub
```bash
git init
git add .
git commit -m "initial mvp"
# create a repo on github, then:
git remote add origin https://github.com/you/anr-mvp.git
git push -u origin main
```

### 4.2 Connect to Vercel
- Go to [vercel.com](https://vercel.com) → New Project
- Import your GitHub repo
- Framework: Vite
- Build command: `npm run build` (should auto-detect)
- Output directory: `dist` (should auto-detect)
- Add environment variables:
  - `VITE_SUPABASE_URL` = your project URL
  - `VITE_SUPABASE_ANON_KEY` = your anon key
- Deploy

### 4.3 Update Supabase redirect URLs
- Go to Supabase → Authentication → URL Configuration
- Add your Vercel URL (e.g. `https://anr-mvp.vercel.app`) to:
  - **Site URL** (change from localhost)
  - **Redirect URLs** (add it, keep localhost too for dev)

### 4.4 Test the production deploy
- Open your Vercel URL
- Run through the full flow: login → onboard → submit → review → leaderboard

---

## Phase 5: Seed and Ship (1-2 hours)

### 5.1 Generate seed bands
- Go to [suno.com](https://suno.com)
- Generate 15-20 songs across different genres
- For each one, submit it through your own app under a "house label" account
- This way the review queue has content on day 1

### 5.2 Ship to humans
- Post in 2-3 places where music + AI people hang out:
  - r/SunoAI on Reddit
  - AI music Discord servers
  - Indie Hackers
- DM 10 friends who make music or like music games
- Goal: 50 signups, 20 active reviewers in week 1

---

## Quick Reference: Common Supabase Errors

| Error | Meaning | Fix |
|-------|---------|-----|
| `PGRST301` | Row-level security blocked it | Check RLS policies match the auth user |
| `23505` | Unique constraint violation | User already reviewed that band, or username taken |
| `22003` | Numeric overflow | Should be fixed (was the avg_rating bug) |
| `42883` | Function not found | Migration didn't run or the RPC name is wrong |
| `JWT expired` | Token timed out | Sign out and back in |
| `FetchError` | Network issue | Check SUPABASE_URL is correct in env |
