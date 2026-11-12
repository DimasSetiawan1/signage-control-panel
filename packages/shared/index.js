const { z } = require('zod');

// WebSocket Event Types
const WS_EVENTS = {
  // Client -> Server
  AUTH: 'auth',
  HELLO: 'hello',
  ACK: 'ack',

  // Server -> Client
  SNAPSHOT: 'snapshot',
  DEVICE_STATUS: 'device:status',
  WELCOME: 'welcome',
  PLAYLIST_UPDATE: 'playlist:update',
  COMMAND_SHOW: 'command:show',
};

// WebSocket Close Codes
const WS_CLOSE_CODES = {
  AUTH_FAILED: 4401,
  DEVICE_AUTH_FAILED: 4403,
  HEARTBEAT_TIMEOUT: 4408,
  DUPLICATE_CONNECTION: 4409,
};

// Internal API Contract
const INTERNAL_API = {
  HEADER_SECRET: 'x-internal-secret',
  DISPATCH_PATH: '/internal/dispatch',
};

// Status Enums
const DEVICE_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
};

const CONTENT_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  TEXT: 'text',
};

// Zod Schemas
const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

const createDeviceSchema = z.object({
  name: z.string().min(1, 'Nama device wajib diisi').max(120, 'Nama maksimal 120 karakter'),
  location: z.string().max(200, 'Lokasi maksimal 200 karakter').optional().nullable(),
});

const updateDeviceSchema = z.object({
  name: z.string().min(1, 'Nama device tidak boleh kosong').max(120).optional(),
  location: z.string().max(200).optional().nullable(),
});

const createContentSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi').max(160, 'Judul maksimal 160 karakter'),
  type: z.enum([CONTENT_TYPES.IMAGE, CONTENT_TYPES.VIDEO, CONTENT_TYPES.TEXT], {
    errorMap: () => ({ message: 'Tipe harus berupa image, video, atau text' }),
  }),
  payload: z.string().min(1, 'Payload tidak boleh kosong'),
});

const updateContentSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  type: z.enum([CONTENT_TYPES.IMAGE, CONTENT_TYPES.VIDEO, CONTENT_TYPES.TEXT]).optional(),
  payload: z.string().min(1).optional(),
});

const playlistItemSchema = z.object({
  content_id: z.string().uuid('ID content tidak valid'),
  duration_sec: z.coerce.number().int().positive('Durasi harus lebih besar dari 0').default(10),
  position: z.number().int().nonnegative().optional(),
});

const updatePlaylistSchema = z.object({
  items: z.array(playlistItemSchema),
});

const pushCommandSchema = z.object({
  content_id: z.string().uuid('ID content tidak valid'),
});

module.exports = {
  WS_EVENTS,
  WS_CLOSE_CODES,
  INTERNAL_API,
  DEVICE_STATUS,
  CONTENT_TYPES,
  loginSchema,
  createDeviceSchema,
  updateDeviceSchema,
  createContentSchema,
  updateContentSchema,
  playlistItemSchema,
  updatePlaylistSchema,
  pushCommandSchema,
};

