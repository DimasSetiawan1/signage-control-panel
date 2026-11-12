# Signage Control Panel

> **Digital Signage Multi-Screen Management System**  
> Dibuat berdasarkan **PRD Signage Control Panel (MJ Solution Indonesia Test)** dengan implementasi **Process-Based Architecture**, Node.js REST API, WebSocket Engine murni, React SPA Dashboard, dan Electron Device Player.

---

## 1. Arsitektur Sistem (Process-Based Architecture)

Sistem dipecah secara ketat menjadi empat proses independen yang masing-masing memiliki satu tanggung jawab (*single responsibility*) dan hanya berkomunikasi melalui kontrak eksplisit (HTTP REST, WebSocket murni, dan Electron Safe IPC), tanpa berbagi memori langsung (*no shared memory*):

```text
               +-------------------------------------------------+
               |             Database & Storage (Supabase)       |
               +-------------------------------------------------+
                          ^                           ^
                          | (Service Key)             | (Service Key)
                          v                           v
+-------------------------------+               +-------------------------------+
|          PROSES API           |               |           PROSES WS           |
|      (Node.js + Express)      |               |        (Node.js + ws)         |
|           Port 4000           |               |           Port 4001           |
|                               |               |                               |
| • CRUD Devices & Contents     |  HTTP Dispt   | • Presence & Online State     |
| • Auth JWT Admin (8 jam)      |-------------->| • Heartbeat Ping/Pong (5s)    |
| • Upload ke Supabase Storage  | (Secret Auth) | • Zero-Latency Broadcast      |
| • Validasi Zod Schemas        |               | • Fallback Local Store Sync   |
+-------------------------------+               +-------------------------------+
       ^                                                ^               ^
       | HTTP REST                                      | WS            | WS (device_token)
       v                                                v               v
+-------------------------------+               +-------------------------------+
|       PROSES DASHBOARD        |               |      PROSES DEVICE-CLIENT     |
|     (React + Vite + TW)       |               |          (Electron)           |
|           Port 5173           |               |                               |
|                               |               | • Main: window & safe IPC     |
| • Overview live summary cards |               | • Preload: contextBridge      |
| • Devices, Contents, Playlist |               | • Renderer: Dual-Slot Crossfade|
| • Instant Push Command        |               | • Zero-Black-Screen Engine    |
| • Real-time status sync       |               | • Pure Display (Configurable) |
+-------------------------------+               +-------------------------------+
```

### Prinsip Utama Desain:
1. **Satu Proses, Satu Tanggung Jawab:**
   - Proses `api` menangani REST endpoint, validasi Zod, upload file, dan autentikasi. `api` tidak memegang koneksi WebSocket persisten.
   - Proses `ws` menangani seluruh koneksi real-time, handshake hello, heartbeat ping/pong, dan penyiaran (*broadcast*) presence. `ws` tidak menjalankan logika CRUD.
2. **Klien Tidak Pernah Memegang Kredensial Database:**
   - Kredensial Supabase (`SUPABASE_SERVICE_ROLE_KEY`) hanya berada di `.env` proses backend (`api` dan `ws`). Dashboard dan Electron player tidak pernah menyentuh database secara langsung.
3. **Presence Milik Proses WebSocket:**
   - Status `online`/`offline` ditentukan secara real-time berdasarkan socket aktif di proses `ws`. Saat boot, proses `ws` otomatis mereset seluruh status device ke `offline`.
4. **Isolasi Kegagalan (Fault Tolerance):**
   - Jika proses `ws` direstart, device client melakukan *exponential backoff reconnection* dan terus memutar playlist dari cache lokal tanpa gangguan layar hitam.
   - Jika Supabase belum dikonfigurasi/dimigrasi, sistem otomatis mengaktifkan *local JSON store fallback* (`packages/shared/localStore.js`) sehingga seluruh fitur tetap 100% fungsional.

---

## 2. Struktur Monorepo

```text
signage-control-panel/
├── apps/
│   ├── api/                 # Proses REST (Express) :4000
│   │   └── src/
│   │       ├── config/      # env.js, supabase.js
│   │       ├── controllers/ # auth, device, content, playlist, push, summary
│   │       ├── middlewares/ # auth (JWT), validation (Zod), upload (Multer), error
│   │       ├── repositories/# device, content, playlist repository
│   │       ├── routes/      # express route modules
│   │       ├── services/    # auth, device, content, playlist, storage, wsDispatcher
│   │       ├── app.js
│   │       └── server.js
│   ├── ws/                  # Proses WebSocket (ws) :4001
│   │   └── src/
│   │       ├── config/      # env.js, supabase.js
│   │       ├── connections/ # connectionManager (pool dashboard & device)
│   │       ├── handlers/    # authHandler (JWT), deviceHandler (hello, presence)
│   │       ├── heartbeat.js # Ping 5s / Timeout 12s
│   │       ├── internal.js  # POST /internal/dispatch (x-internal-secret)
│   │       ├── db.js        # status updater & snapshot query
│   │       └── server.js    # boot & handshake listener
│   ├── dashboard/           # SPA Admin (React + Vite + Tailwind CSS) :5173
│   │   └── src/
│   │       ├── components/  # Navbar, Sidebar, Modal, Toast
│   │       ├── pages/       # LoginPage, OverviewPage, DevicesPage, ContentsPage, PlaylistsPage
│   │       ├── lib/         # api client, ws live client, formatTime
│   │       ├── App.jsx
│   │       └── main.jsx
│   └── device-client/       # Electron Signage Player
│       ├── main/            # index.js (BrowserWindow, safe IPC, kiosk support)
│       ├── preload/         # index.js (contextBridge exposeInMainWorld)
│       ├── renderer/        # index.html, app.js (dual-slot crossfade), style.css
│       └── launcher.js      # Clean launcher (strips ELECTRON_RUN_AS_NODE)
├── packages/
│   └── shared/              # Zod validation schemas, WS event constants, local fallback store
├── supabase/
│   └── migrations/
│       ├── 01_schema.sql    # DDL schema: devices, contents, playlist_items, storage bucket
│       └── 02_seed.sql      # Seed data demo
├── tests/
│   ├── test-api.js          # Automated REST API test suite
│   └── test-ws-presence.js  # Automated WebSocket presence test suite
├── .env.example
├── .env
├── package.json             # npm workspaces & root scripts
└── README.md
```

---

## 3. Matriks Fitur (Berdasarkan PRD)

### Fitur Wajib (P0)

| Fitur | Keterangan & Implementasi | Status |
| --- | --- | :---: |
| **Skema Database Supabase** | Tabel `devices`, `contents`, `playlist_items`, indeks performa, dan bucket public `contents`. | ✅ Selesai |
| **REST API CRUD Devices** | Tambah, lihat, ubah, hapus device. Token pairing acak otomatis (`encode(gen_random_bytes(24), 'hex')`). | ✅ Selesai |
| **REST API CRUD Contents** | Mendukung tipe `image`, `video`, dan `text`. Upload file drag-and-drop (Multer) atau direct URL. | ✅ Selesai |
| **Status Real-Time Tanpa Refresh** | Broadcast WebSocket seketika saat device connect/disconnect. Badge UI update dalam < 1 detik. | ✅ Selesai |
| **Dashboard Admin** | Ringkasan kartu status, filter status/pencarian, modal dialog, toast feedback, navigasi sidebar. | ✅ Selesai |
| **Device Client Layar Penuh** | Pemutaran konten media gambar, video MP4, dan poster teks dengan tipografi responsif. | ✅ Selesai |

### Fitur Bonus (P1)

| Fitur | Keterangan & Implementasi | Status |
| --- | --- | :---: |
| **Playlist Berurutan per Device** | Mengatur urutan slide konten dan durasi penayangan (`duration_sec`) per item. | ✅ Selesai |
| **Instant Push Command ("Kirim Sekarang")** | Menayangkan konten pilihan secara instan menimpa playlist normal via WS. Menolak dengan HTTP 409 bila device offline. | ✅ Selesai |
| **Aplikasi Desktop Electron** | Pola IPC aman (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`), penyimpanan config di `userData`. | ✅ Selesai |
| **Autentikasi JWT Admin** | Login admin mengembalikan JWT berumur 8 jam; route API & handshake WS dashboard diproteksi token. | ✅ Selesai |
| **Reconnection & Offline Caching** | Exponential backoff (1s - 30s + jitter) saat disconnect. Konten terakhir tetap berputar dari cache lokal. | ✅ Selesai |

---

## 4. Keunggulan Teknis yang Diterapkan

1. **Dual-Buffer Seamless Crossfade (Zero-Black-Screen Engine):**
   - Menggunakan dua slot buffer independen (`#media-slot-a` dan `#media-slot-b`) dengan penahan *underlay*.
   - Slot berikutnya dimuat dan didecode sepenuhnya di latar belakang sebelum crossfade opacity (500ms) dijalankan. Layar **tidak pernah mengalami kedip hitam (*no black flash*)** saat transisi antar-slide.
2. **Network & Media Fallback Graceful:**
   - Jika suatu URL media eksternal (gambar/video) gagal dimuat karena kendala jaringan atau error HTTP (misal 403/404), sistem **tidak akan membiarkan layar menjadi hitam**, melainkan otomatis menampilkan kartu poster teks yang rapi dan elegan menampilkan judul konten.
3. **Mode Pemutaran Fleksibel:**
   - **Putar Acak (Random Shuffle):** Konten berikutnya dipilih secara acak tanpa jeda gelap.
   - **Putar Berurutan (Sequential):** Memutar berurutan 1, 2, 3 sesuai playlist.
4. **Pure Signage Display vs Local Debug Mode (via `.env`):**
   - Diatur melalui variabel `CLIENT_SHOW_OVERLAY` pada file `.env`.
   - **Mode Production (`CLIENT_SHOW_OVERLAY=false`):** Tampilan murni 100% tanpa notifikasi banner, tanpa badge pojok kanan bawah, dan kursor mouse otomatis sembunyi setelah 3 detik.
   - **Mode Debug (`CLIENT_SHOW_OVERLAY=true`):** Menampilkan badge status koneksi & tombol pengaturan di pojok kanan bawah.
   - **Shortcut Kios:** Jendela pengaturan pairing dapat dibuka kapan saja dengan menekan tombol keyboard **`F2`** atau **`Ctrl + ,`**.
5. **Zero-Latency Real-Time Presence:**
   - Server mem-broadcast event `device:status` secara langsung (*synchronous broadcast*) begitu socket terputus sebelum menjalankan operasi remote database.
   - Dilengkapi listener `beforeunload` pada Electron Client untuk penutupan resmi (*clean teardown*) seketika.

---

## 5. Panduan Instalasi & Menjalankan Sistem

### Persyaratan Sistem
- Node.js v18+, v20+, atau v24+
- npm v9+ atau v10+

### Langkah 1: Kloning & Install Dependensi
Jalankan di root direktori project:

```bash
npm install
```

### Langkah 2: Konfigurasi Environment Variable (`.env`)
Salin file `.env.example` menjadi `.env` (atau gunakan file `.env` yang sudah tersedia):

```env
# Server Ports
PORT=4000
WS_PORT=4001

# Authentication & Internal Communication Secrets
JWT_SECRET=super-secret-jwt-key-signage-panel-change-in-production
INTERNAL_SECRET=super-secret-internal-dispatch-key-mj-solution-2026

# Supabase Credentials (Opsional, sudah ada fallback local store otomatis)
SUPABASE_URL=https://gectchhudamzzjhxrhla.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Default Admin User
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# Client Frontend URLs
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4001

# Device Client Display Configuration
CLIENT_SHOW_OVERLAY=false
NODE_ENV=production
```

> **Catatan Resilience:** Bila tabel Supabase belum dimigrasi atau koneksi Supabase terputus, sistem secara otomatis beralih ke *fallback local JSON store* (`.data/db.json`), sehingga seluruh fungsi CRUD, upload, playlist, dan WebSocket tetap dapat dijalankan tanpa error.

### Langkah 3: Setup Database Supabase (Opsional bila menggunakan Supabase Live)
1. Buka dashboard Supabase Anda di [https://supabase.com](https://supabase.com).
2. Masuk ke menu **SQL Editor**, buka file `supabase/migrations/01_schema.sql`, salin isinya dan klik **Run**.
3. (Opsional) Salin isi `supabase/migrations/02_seed.sql` dan klik **Run** untuk memasukkan data awal.
4. Pada menu **Storage**, pastikan bucket bernama `contents` telah aktif dengan status **Public Bucket**.

### Langkah 4: Menjalankan Seluruh Sistem Sekaligus

Cukup jalankan satu perintah di root:

```bash
npm run dev
```

Perintah ini akan menjalankan tiga proses utama secara paralel menggunakan `concurrently`:
- **API Server:** `http://localhost:4000` (Health: `GET /health`)
- **WebSocket Server:** `ws://localhost:4001` (Health: `GET http://localhost:4001/health`)
- **Dashboard Admin:** `http://localhost:5173`

### Langkah 5: Membuka Dashboard Admin
Buka browser ke `http://localhost:5173`.  
Login menggunakan kredensial default admin:
- **Email:** `admin@example.com`
- **Password:** `admin123`

### Langkah 6: Menjalankan Device Client (Electron Player)
Buka terminal baru di root direktori, lalu jalankan:

```bash
npm run dev:client
```

Jendela Electron akan terbuka dan langsung memainkan konten dari playlist layar terpilih secara layar penuh (*fullscreen / kiosk mode*).

---

## 6. Pengujian Otomatis (Automated Tests)

Monorepo ini dilengkapi test suite otomatis untuk memverifikasi fungsionalitas REST API dan siklus WebSocket Presence secara end-to-end:

```bash
npm test
```

### Hasil Test Suite:
1. **REST API Test (`tests/test-api.js`):**
   - Health check API
   - Autentikasi JWT login admin
   - CRUD Devices & token generation
   - CRUD Contents & type validation
   - Summary endpoint
2. **WebSocket Presence Test (`tests/test-ws-presence.js`):**
   - Handshake dashboard auth (JWT)
   - Snapshot initial load
   - Handshake device hello (`device_token`)
   - Broadcast online event ke dashboard
   - Broadcast offline event saat device terputus

---

## 7. Skenario Demo & Panduan Pengujian Manual

| Skenario Uji | Tindakan | Hasil yang Diharapkan |
| --- | --- | --- |
| **Real-time Online Presence** | Jalankan `npm run dev:client` | Dalam < 1 detik, kartu `ONLINE` di dashboard bertambah, indikator status device berubah menjadi hijau **Online** tanpa reload halaman. |
| **Real-time Offline Presence** | Tutup jendela Electron Player | Dalam < 1 detik, status device di dashboard seketika berubah menjadi **Offline** dan counter online berkurang. |
| **Instant Push Command** | Di dashboard buka tab **Playlist**, klik tombol **"Kirim Sekarang"** pada salah satu konten | Layar Electron client langsung menayangkan konten pilihan secara mulus tanpa jeda dan tanpa notifikasi yang mengganggu. |
| **Push ke Device Offline** | Klik **"Kirim Sekarang"** saat jendela Electron tertutup | Dashboard menampilkan toast penolakan HTTP 409 Conflict: *"Device sedang offline. Tidak dapat mengirim command langsung."* |
| **Zero-Black-Screen Crossfade** | Perhatikan pergantian slide di Electron player | Transisi antar konten (gambar, video, teks) berjalan mulus tanpa kedip hitam (*no black flash*). |
| **Upload Media ke Storage** | Di tab **Konten**, klik **"Upload Konten"**, drag & drop file JPG/PNG atau video MP4 (maks 20 MB) | File terunggah, URL tersimpan di payload, dan thumbnail preview langsung muncul pada gallery card. |
| **Pengaturan Tampilan Client** | Ubah `CLIENT_SHOW_OVERLAY=true` di `.env` lalu restart client | Badge status koneksi & tombol pengaturan muncul di pojok kanan bawah. |

---

## 8. Spesifikasi Kontrak Endpoint & Event

### REST API (Port 4000)
Format respons seragam: `{ "data": ... }` untuk sukses, `{ "error": { "code", "message" } }` untuk error.

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Login admin, mengembalikan token JWT |
| `GET` | `/api/devices` | Mengambil daftar device (filter query `status`, `q`) |
| `POST` | `/api/devices` | Mendaftarkan device baru |
| `GET` | `/api/devices/:id` | Detail device spesifik |
| `PUT` | `/api/devices/:id` | Mengubah nama / lokasi device |
| `DELETE` | `/api/devices/:id` | Menghapus device |
| `GET` | `/api/contents` | Mengambil daftar konten media (filter `type`, `q`) |
| `POST` | `/api/contents` | Membuat konten (mendukung multipart form-data upload) |
| `GET` | `/api/contents/:id` | Detail konten |
| `PUT` | `/api/contents/:id` | Mengubah judul / payload konten |
| `DELETE` | `/api/contents/:id` | Menghapus konten & file di storage |
| `GET` | `/api/devices/:id/playlist` | Mengambil urutan playlist suatu device |
| `PUT` | `/api/devices/:id/playlist` | Menyimpan susunan urutan & durasi slide playlist |
| `POST` | `/api/devices/:id/push` | Perintah siaran instan ke layar device (`{ content_id }`) |
| `GET` | `/api/summary` | Ringkasan metrik (total device, online, offline, total konten) |
| `GET` | `/health` | Health check API service |

### WebSocket Events (Port 4001)

| Arah | Event Type | Payload | Keterangan |
| --- | --- | --- | --- |
| Dashboard → Server | `auth` | `{ token }` | Handshake JWT admin dashboard |
| Device → Server | `hello` | `{ device_token }` | Handshake pairing device player |
| Server → Dashboard | `snapshot` | `{ devices }` | Kirim seluruh status awal perangkat saat dashboard terhubung |
| Server → Dashboard | `device:status` | `{ id, status, last_seen }` | Broadcast seketika saat status online/offline berubah |
| Server → Device | `welcome` | `{ device, playlist }` | Konfirmasi pairing sukses & kirim playlist awal |
| Server → Device | `playlist:update` | `{ items }` | Disiarkan saat admin mengubah susunan playlist |
| Server → Device | `command:show` | `{ content }` | Perintah push penayangan instan |
| Dua arah | `ping` / `pong` | Frame WebSocket | Heartbeat teratur (5s ping / 12s timeout) |

---

## 9. Lisensi & Hak Cipta
Project ini dikembangkan untuk **MJ Solution Indonesia Test** dengan standar industri *Production-Ready Digital Signage Solution*.
