const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const isImage = file.mimetype.startsWith('image/');
  const isMp4 = file.mimetype === 'video/mp4';

  if (isImage || isMp4) {
    cb(null, true);
  } else {
    const err = new Error('Tipe file tidak didukung. Hanya gambar (image/*) dan video MP4 (video/mp4) yang diperbolehkan.');
    err.statusCode = 415;
    err.code = 'UNSUPPORTED_MEDIA_TYPE';
    cb(err, false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
  fileFilter,
});

function handleUpload(fieldName = 'file') {
  const single = upload.single(fieldName);
  return (req, res, next) => {
    single(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'Ukuran file melebihi batas maksimum 20 MB.',
            },
          });
        }
        return res.status(400).json({
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message,
          },
        });
      } else if (err) {
        const status = err.statusCode || 400;
        return res.status(status).json({
          error: {
            code: err.code || 'UPLOAD_ERROR',
            message: err.message,
          },
        });
      }
      next();
    });
  };
}

module.exports = {
  upload,
  handleUpload,
};

