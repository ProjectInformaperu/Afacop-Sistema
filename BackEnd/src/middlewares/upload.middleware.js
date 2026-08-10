import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import multer from 'multer';

const uploadDir = path.join(os.tmpdir(), 'radar360-imports');
fs.mkdirSync(uploadDir, { recursive: true, mode: 0o700 });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, _file, callback) => callback(null, `${crypto.randomUUID()}.xlsx`),
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024, files: 1, fields: 5 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedMime = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ];
    if (extension === '.xlsx' && allowedMime.includes(file.mimetype)) return callback(null, true);
    callback(Object.assign(new Error('Solo se permiten archivos XLSX de hasta 100 MB'), { statusCode: 400, code: 'INVALID_IMPORT_FILE' }));
  },
});

export default upload;
