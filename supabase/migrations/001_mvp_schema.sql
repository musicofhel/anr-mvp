-- A&R MVP Schema
-- Paste this into Supabase SQL Editor and run

create extension if not exists "uuid-ossp";

-- ── Enums ──────────────────────────────────────────────────

create type genre_type as enum (
  'pop', 'rock', 'hip_hop', 'electronic', 'r_and_b',
  'country', 'jazz', 'classical', 'indie', 'metal',
  'folk', 'latin', 'reggae', 'punk', 'ambient'
);

-- ── Tables ─────────────────────────────────────────────────

-- Extends Supabase auth.users
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  avatar_url  text,
  created_at  timestamptz default now() not null
);

-- One label per user
create table public.labels (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid unique not null references public.profiles(id) on delete cascade,
  name        text unique not null,
  specialty   genre_type,
  energy      int default 3 not null check (energy >= 0),
  royalties   int default 0 not null check (royalties >= 0),
  created_at  timestamptz default now() not null
);

-- Bands — user pastes a Suno link, fills in name/genre
create table public.bands (
  id            uuid primary key default uuid_generate_v4(),
  creator_id    uuid not null references public.labels(id) on delete cascade,
  name          text not null,
  genre         genre_type not null,
  suno_url      text,           -- pasted Suno share link
  cover_url     text,
  avg_rating    numeric(4,2) default 0,
  review_count  int default 0,
  is_submitted  boolean default false,
  submitted_at  timestamptz,
  created_at    timestamptz default now() not null
);

-- Tracks — optional, user can add track titles
create table public.tracks (
  id            uuid primary key default uuid_generate_v4(),
  band_id       uuid not null references public.bands(id) on delete cascade,
  title         text not null,
  track_number  smallint not null default 1,
  created_at    timestamptz default now() not null,
  unique(band_id, track_number)
);

-- Reviews — the core mechanic
create table public.reviews (
  id                uuid primary key default uuid_generate_v4(),
  band_id           uuid not null references public.bands(id) on delete cascade,
  reviewer_id       uuid not null references public.labels(id) on delete cascade,
  rating            smallint not null check (rating between 1 and 10),
  notes             text default '',
  royalties_earned  int not null default 5,
  created_at        timestamptz default now() not null,
  unique(band_id, reviewer_id)
);

-- ── Indexes ────────────────────────────────────────────────

create index idx_bands_submitted on public.bands(is_submitted) where is_submitted = true;
create index idx_bands_rating on public.bands(avg_rating desc);
create index idx_reviews_band on public.reviews(band_id);
create index idx_reviews_reviewer on public.reviews(reviewer_id);

-- ── Auto-update rating on new review ───────────────────────

create or replace function public.handle_new_review()
returns trigger as $$
begin
  -- Update band stats
  update public.bands set
    avg_rating = (select round(avg(rating)::numeric, 2) from public.reviews where band_id = NEW.band_id),
    review_count = (select count(*) from public.reviews where band_id = NEW.band_id)
  where id = NEW.band_id;

  -- Credit reviewer with 5 royalties
  update public.labels set
    royalties = royalties + 5
  where id = NEW.reviewer_id;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_review_created
  after insert on public.reviews
  for each row execute function public.handle_new_review();

-- ── Deduct energy on band creation ─────────────────────────

create or replace function public.handle_new_band()
returns trigger as $$
declare
  v_energy int;
begin
  select energy into v_energy from public.labels where id = NEW.creator_id for update;

  if v_energy is null or v_energy < 1 then
    raise exception 'Not enough energy';
  end if;

  update public.labels set energy = energy - 1 where id = NEW.creator_id;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_band_created
  before insert on public.bands
  for each row execute function public.handle_new_band();

-- ── RPC: Get review queue (bands user hasn't reviewed) ─────

create or replace function public.get_review_queue(p_label_id uuid, p_limit int default 10)
returns table (
  id uuid,
  creator_id uuid,
  name text,
  genre genre_type,
  suno_url text,
  cover_url text,
  avg_rating numeric,
  review_count int,
  is_submitted boolean,
  submitted_at timestamptz,
  created_at timestamptz,
  creator_label_name text
) as $$
  select
    b.id, b.creator_id, b.name, b.genre, b.suno_url, b.cover_url,
    b.avg_rating, b.review_count, b.is_submitted, b.submitted_at, b.created_at,
    l.name as creator_label_name
  from public.bands b
  join public.labels l on l.id = b.creator_id
  where b.is_submitted = true
    and b.creator_id != p_label_id
    and b.id not in (
      select r.band_id from public.reviews r where r.reviewer_id = p_label_id
    )
  order by b.submitted_at desc
  limit p_limit;
$$ language sql security definer;

-- ── RPC: Convert royalties to energy (10 royalties = 1 energy) ──

create or replace function public.buy_energy(p_label_id uuid, p_amount int default 1)
returns json as $$
declare
  v_cost int;
  v_royalties int;
  v_new_energy int;
  v_new_royalties int;
begin
  v_cost := p_amount * 10;

  select royalties, energy into v_royalties, v_new_energy
  from public.labels where id = p_label_id for update;

  if v_royalties is null then
    raise exception 'Label not found';
  end if;

  if v_royalties < v_cost then
    raise exception 'Not enough royalties (need %, have %)', v_cost, v_royalties;
  end if;

  v_new_royalties := v_royalties - v_cost;
  v_new_energy := v_new_energy + p_amount;

  update public.labels set
    royalties = v_new_royalties,
    energy = v_new_energy
  where id = p_label_id;

  return json_build_object(
    'energy', v_new_energy,
    'royalties', v_new_royalties,
    'cost', v_cost
  );
end;
$$ language plpgsql security definer;

-- ── RLS ────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.labels enable row level security;
alter table public.bands enable row level security;
alter table public.tracks enable row level security;
alter table public.reviews enable row level security;

-- Profiles
create policy "Public profiles" on public.profiles
  for select using (true);
create policy "Own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Labels
create policy "Public labels" on public.labels
  for select using (true);
create policy "Create own label" on public.labels
  for insert with check (auth.uid() = owner_id);
create policy "Update own label" on public.labels
  for update using (auth.uid() = owner_id);

-- Bands
create policy "See submitted bands or own" on public.bands
  for select using (
    is_submitted = true
    or creator_id in (select id from public.labels where owner_id = auth.uid())
  );
create policy "Create own bands" on public.bands
  for insert with check (
    creator_id in (select id from public.labels where owner_id = auth.uid())
  );
create policy "Update own bands" on public.bands
  for update using (
    creator_id in (select id from public.labels where owner_id = auth.uid())
  );

-- Tracks
create policy "Public tracks" on public.tracks
  for select using (true);
create policy "Create own tracks" on public.tracks
  for insert with check (
    band_id in (
      select b.id from public.bands b
      join public.labels l on l.id = b.creator_id
      where l.owner_id = auth.uid()
    )
  );

-- Reviews
create policy "Public reviews" on public.reviews
  for select using (true);
create policy "Create own reviews" on public.reviews
  for insert with check (
    reviewer_id in (select id from public.labels where owner_id = auth.uid())
  );
