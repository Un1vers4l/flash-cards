-- Flashcards schema for Supabase.
-- Run this in the Supabase dashboard → SQL Editor.

create table if not exists public.cards (
  id          uuid primary key default gen_random_uuid(),
  german      text not null,
  translation text not null,
  language    text not null default 'Spanish',
  phase       int  not null default 1 check (phase between 1 and 6),
  due_date    date not null default current_date,
  created_at  timestamptz not null default now()
);

create index if not exists cards_due_date_idx on public.cards (due_date);

-- Row Level Security.
--
-- This is a single-user personal app that is gated by a predefined username /
-- password in the front end and talks to Supabase with the public anon key.
-- The policy below lets the anon role read and write the cards table. That is
-- fine for a personal project; anyone who obtains the anon key could read/write
-- these rows. If you want a real security boundary, switch the app to Supabase
-- Auth and scope rows to auth.uid() instead.
alter table public.cards enable row level security;

drop policy if exists "anon full access to cards" on public.cards;
create policy "anon full access to cards"
  on public.cards
  for all
  to anon
  using (true)
  with check (true);

-- Categories: named collections of cards for manual practice.
-- card_ids holds the member card ids; a missing card id is simply ignored when
-- the app resolves a category, so no foreign key is required.
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  card_ids   uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "anon full access to categories" on public.categories;
create policy "anon full access to categories"
  on public.categories
  for all
  to anon
  using (true)
  with check (true);
