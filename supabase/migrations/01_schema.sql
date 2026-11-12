-- Supabase Postgres Schema for Signage Control Panel
-- PRD Section 6

create extension if not exists pgcrypto;

-- 1. Devices Table
create table if not exists devices (
  id           uuid primary key default gen_random_uuid(),
  name         varchar(120) not null,
  location     varchar(200),
  status       varchar(10)  not null default 'offline'
               check (status in ('online','offline')),
  last_seen    timestamptz,
  device_token text unique not null default encode(gen_random_bytes(24), 'hex'),
  created_at   timestamptz not null default now()
);

-- 2. Contents Table
create table if not exists contents (
  id         uuid primary key default gen_random_uuid(),
  title      varchar(160) not null,
  type       varchar(10)  not null check (type in ('image','video','text')),
  payload    text not null,
  created_at timestamptz not null default now()
);

-- 3. Playlist Items Table
create table if not exists playlist_items (
  id           uuid primary key default gen_random_uuid(),
  device_id    uuid not null references devices(id)  on delete cascade,
  content_id   uuid not null references contents(id) on delete cascade,
  position     int  not null,
  duration_sec int  not null default 10 check (duration_sec > 0),
  unique (device_id, position)
);

-- Indexes for performance
create index if not exists idx_devices_status on devices (status);
create index if not exists idx_playlist_items_device_position on playlist_items (device_id, position);

-- Supabase Storage Bucket setup for 'contents'
-- (Note: can also be created via Supabase Dashboard UI or storage api)
insert into storage.buckets (id, name, public)
values ('contents', 'contents', true)
on conflict (id) do update set public = true;

-- Storage Policy: Public Read
create policy "Public Access to Contents"
on storage.objects for select
using (bucket_id = 'contents');

-- Storage Policy: Service Role Upload/Delete (handled automatically by service role key)

