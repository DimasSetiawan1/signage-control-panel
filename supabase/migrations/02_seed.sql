-- Seed Data for Testing & Demo
-- PRD Section 6 & 9

-- 1. Sample Contents
insert into contents (id, title, type, payload)
values 
  ('11111111-1111-1111-1111-111111111111', 'Selamat Datang di MJ Solution Indonesia', 'text', 'Selamat Datang di PT MJ Solution Indonesia!\nInovasi Solusi Digital Signage Terpercaya.'),
  ('22222222-2222-2222-2222-222222222222', 'Company Showcase Poster', 'image', 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1200&q=80'),
  ('33333333-3333-3333-3333-333333333333', 'Demo Loop Video', 'video', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4')
on conflict (id) do nothing;

-- 2. Sample Devices
insert into devices (id, name, location, status, device_token)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Layar Lobby Utama', 'Gedung A - Lantai 1', 'offline', 'token_lobby_utama_demo_12345'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Layar Cafeteria', 'Gedung B - Lantai 2', 'offline', 'token_cafeteria_demo_67890'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Layar Meeting Room VIP', 'Gedung A - Lantai 3', 'offline', 'token_meeting_vip_demo_54321')
on conflict (id) do nothing;

-- 3. Sample Playlist for Lobby Utama
insert into playlist_items (device_id, content_id, position, duration_sec)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 0, 8),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 1, 12),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 2, 15)
on conflict (device_id, position) do nothing;

