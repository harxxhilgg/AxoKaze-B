import multer from "multer";
import { Request } from "express";

// storage in memory for processing
const storage = multer.memoryStorage();

// filter files
const fileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/jpg', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG and WebP images are allowed"), false);
  };
};

// multer config
export const uploadProfilePicture = multer({
  storage: storage,
  fileFilter: fileFilter, 
  limits: {
    fileSize: 5 * 1024 * 1024
  },
});