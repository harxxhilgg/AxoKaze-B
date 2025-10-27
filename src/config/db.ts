import mongoose from "mongoose";
import logger from "../utils/logger";

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    logger.info("MongoDB already connected");
    return;
  }

  try {
    if (!process.env.MONGO_URI) {
      logger.error(
        "MONGO_URI is not set in environment. Skipping MongoDB connection."
      );
      return;
    }

    const connect = await mongoose.connect(process.env.MONGO_URI as string, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    logger.info(`MongoDB Connected @ ${connect.connection.host}`);
  } catch (e) {
    logger.error("MongoDB Connection Error: ", e);
    // DON'T EXIT IN SERVERLESS ~ JUST LOG THE ERROR
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
  }
};

export default connectDB;
