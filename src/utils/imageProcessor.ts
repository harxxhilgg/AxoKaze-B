import sharp from "sharp";
import logger from "./logger";

export const processProfileImage = async (buffer: Buffer): Promise<Buffer> => {
  try {
    const processedBuffer = await sharp(buffer)
      .resize(400, 400, {
        fit: "cover",
        position: "center"
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    return processedBuffer;
  } catch (error) {
    logger.error("Image processing error: ", error);
    throw new Error("Failed to process image");
  };
};