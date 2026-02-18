import multer from "multer";
import { v4 as uuid } from "uuid";
const storage = multer.diskStorage({
  destination: function (__, _, cb) {
    cb(null, "/uploads");
  },
  filename: function (_, file, cb) {
    const user_file = uuid() + file.originalname;
    cb(null, user_file);
  },
});

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
});
