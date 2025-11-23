import axios from "axios";
import FormData from "form-data";
import logger from "./logger";

interface ImgBBResponse {
  data: {
    id: string;
    url: string;
    display_url: string;
    delete_url: string;
  },
  success: boolean;
  status: number;
};

export const uploadToImgBB = async (imageBuffer: Buffer, filename: string): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('image', imageBuffer.toString('base64')); 
    formData.append('name', filename);

    const res = await axios.post<ImgBBResponse>(
      `https://api.imgbb.com/1/upload?Key=${process.env.IMGBB_API_KEY}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000
      }
    );

    if (res.data.success) {
      return res.data.data.display_url;
    } else {
      throw new Error("ImgBB upload failed");
    };
  } catch (error) {
    logger.error("ImbBB upload error: ", error);
    throw new Error("Failed to upload image to ImgBB");
  };
};

export const deleteFromImgBB = async (deleteUrl: string): Promise<void> => {
  try {
    logger.info(`Image should be deleted: ${deleteUrl}`);
  } catch (error) {
    logger.warn("Failed to delete image from ImgBB: ", error);
  };
};