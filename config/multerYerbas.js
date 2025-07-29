// config/multerYerbas.js
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';

const storage = multer.diskStorage({
  destination: 'public/yerbas',
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase(); // .jpg .png …
    const safeName = file.originalname
      .toLowerCase()
      .replace(/\s+/g, '-')    // espacios -> guiones
      .replace(ext, '');
    cb(null, `${safeName}-${uuid()}${ext}`); // evita colisiones
  }
});

export const uploadYerba = multer({ storage });
