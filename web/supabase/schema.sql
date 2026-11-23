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
  created_at         timestamptz not null default now(),
  chain_nest_id      integer,
  vault              text,
  guardian           text
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
  status      text not null check (status in ('pending','usdc_received','buying','delivered','returned','failed')),
  tx_hash     text,
  chain_gift_id  bigint,
  unlock_at      timestamptz,
  expires_at     timestamptz,
  refund_reason  text check (refund_reason in ('expired','ineligible')),
  settle_tx_hash text,
  created_at  timestamptz not null default now()
);

create unique index if not exists gifts_tx_hash_idx on public.gifts (tx_hash) where tx_hash like '0x%' and length(tx_hash) = 66;
create index if not exists gifts_nest_created_idx on public.gifts (nest_slug, created_at desc);

alter table public.nests enable row level security;
alter table public.gifts enable row level security;

-- Child photos. Public-read so the gift page and link previews can show them;
-- file names are random 128-bit IDs. Uploads go through the server only.
insert into storage.buckets (id, name, public)
values ('child-photos', 'child-photos', true)
on conflict (id) do nothing;

-- Upgrading an existing database:
-- alter table public.nests add column if not exists chain_nest_id integer, add column if not exists vault text, add column if not exists guardian text;

-- Upgrade from the first version (escrow gifts with claim, unlock date and expiry).
alter table public.gifts add column if not exists chain_gift_id bigint;
alter table public.gifts add column if not exists unlock_at timestamptz;
alter table public.gifts add column if not exists expires_at timestamptz;
alter table public.gifts add column if not exists refund_reason text;
alter table public.gifts add column if not exists settle_tx_hash text;
alter table public.gifts drop constraint if exists gifts_status_check;
alter table public.gifts add constraint gifts_status_check check (status in ('pending','usdc_received','buying','delivered','returned','failed'));
