const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.resolve(__dirname, '../../.data');
const dbFilePath = path.join(dataDir, 'db.json');

const initialSeed = {
  contents: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Selamat Datang di MJ Solution Indonesia',
      type: 'text',
      payload: 'Selamat Datang di PT MJ Solution Indonesia!\nInovasi Solusi Digital Signage Terpercaya.',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      title: 'Company Showcase Poster',
      type: 'image',
      payload: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1200&q=80',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      title: 'Demo Loop Video',
      type: 'video',
      payload: 'https://vjs.zencdn.net/v/oceans.mp4',
      created_at: new Date().toISOString(),
    },
  ],
  devices: [
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      name: 'Layar Lobby Utama',
      location: 'Gedung A - Lantai 1',
      status: 'offline',
      last_seen: null,
      device_token: 'token_lobby_utama_demo_12345',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      name: 'Layar Cafeteria',
      location: 'Gedung B - Lantai 2',
      status: 'offline',
      last_seen: null,
      device_token: 'token_cafeteria_demo_67890',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      name: 'Layar Meeting Room VIP',
      location: 'Gedung A - Lantai 3',
      status: 'offline',
      last_seen: null,
      device_token: 'token_meeting_vip_demo_54321',
      created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
  ],
  playlist_items: [
    {
      id: 'p1111111-1111-1111-1111-111111111111',
      device_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      content_id: '11111111-1111-1111-1111-111111111111',
      position: 0,
      duration_sec: 8,
    },
    {
      id: 'p2222222-2222-2222-2222-222222222222',
      device_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      content_id: '22222222-2222-2222-2222-222222222222',
      position: 1,
      duration_sec: 12,
    },
    {
      id: 'p3333333-3333-3333-3333-333333333333',
      device_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      content_id: '33333333-3333-3333-3333-333333333333',
      position: 2,
      duration_sec: 15,
    },
  ],
};

function ensureDbFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dbFilePath)) {
    fs.writeFileSync(dbFilePath, JSON.stringify(initialSeed, null, 2), 'utf-8');
  }
}

function readDb() {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(dbFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading local DB file, restoring seed:', err);
    fs.writeFileSync(dbFilePath, JSON.stringify(initialSeed, null, 2), 'utf-8');
    return JSON.parse(JSON.stringify(initialSeed));
  }
}

function writeDb(data) {
  ensureDbFile();
  fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
  readDb,
  writeDb,
  initialSeed,
};

