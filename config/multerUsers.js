import multer from 'multer';
import path   from 'path';
import { v4 as uuid } from 'uuid';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) =>
    cb(null, path.join(process.cwd(), 'public', 'users')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase(); // .jpg, .png…
    cb(null, `${uuid()}${ext}`);
  },
});

export const uploadAvatar = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    cb(null, /\.(jpe?g|png|webp)$/i.test(file.originalname));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});
