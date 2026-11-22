-- StockNest schema. Paste into Supabase: SQL Editor > New query > Run.
-- Only the server (service-role key) reads and writes. Row level security is on
-- with no policies, so the public anon key can't touch these tables.

create table if not exists public.nests (
  slug               text primary key,
  child_name         text not null,
  nest_name          text not null,
  avatar             text not null check (avatar in ('amelia','tobi','sprout','bear')),
  photo_url          text,
  show_photo         boolean not null default true,
  note               text not null default '',
  parent_names       text not null default '',
  milestone          text,
  goal               numeric,
  picks              text[] not null,
  show_amounts       boolean not null default true,
  manage_token_hash  text,
  created_at         timestamptz not null default now()
);

create table if not exists public.gifts (
  id          text primary key,
  nest_slug   text not null references public.nests(slug) on delete cascade,
  giver       text not null,
  is_private  boolean not null default false,
  ticker      text not null,
  shares      numeric not null,
  usd         numeric not null,
  occasion    text not null,
  message     text not null default '',
  mode        text not null check (mode in ('buy','own')),
  status      text not null check (status in ('usdc_received','buying','delivered','returned','failed')),
  tx_hash     text,
  created_at  timestamptz not null default now()
);

create index if not exists gifts_nest_created_idx on public.gifts (nest_slug, created_at desc);

alter table public.nests enable row level security;
alter table public.gifts enable row level security;

-- Child photos. Public-read so the gift page and link previews can show them;
-- file names are random 128-bit IDs. Uploads go through the server only.
insert into storage.buckets (id, name, public)
values ('child-photos', 'child-photos', true)
on conflict (id) do nothing;
