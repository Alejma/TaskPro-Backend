const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.resolve('uploads')),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '-' + safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = upload;
