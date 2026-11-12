const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { supabase, isLiveSupabase } = require('../config/supabase');
const env = require('../config/env');

const BUCKET_NAME = 'contents';
const localUploadsDir = path.resolve(__dirname, '../../uploads');

function ensureLocalUploads() {
  if (!fs.existsSync(localUploadsDir)) {
    fs.mkdirSync(localUploadsDir, { recursive: true });
  }
}

const storageService = {
  async uploadFile(file) {
    if (!file) throw new Error('No file provided');

    const ext = path.extname(file.originalname).toLowerCase();
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

    if (isLiveSupabase) {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        throw new Error(`Supabase Storage upload failed: ${error.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    }

    // Local uploads fallback
    ensureLocalUploads();
    const filePath = path.join(localUploadsDir, fileName);
    fs.writeFileSync(filePath, file.buffer);
    return `http://localhost:${env.PORT}/uploads/${fileName}`;
  },

  async deleteFileByUrl(url) {
    if (!url) return;

    try {
      if (isLiveSupabase && url.includes(BUCKET_NAME)) {
        const parts = url.split(`${BUCKET_NAME}/`);
        if (parts.length > 1) {
          const fileName = parts[1].split('?')[0];
          await supabase.storage.from(BUCKET_NAME).remove([fileName]);
        }
      } else if (url.includes('/uploads/')) {
        const fileName = path.basename(url.split('?')[0]);
        const filePath = path.join(localUploadsDir, fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (err) {
      console.warn('[Storage] Error deleting file:', err.message);
    }
  },
};

module.exports = storageService;

