import mongoose from "mongoose";
import logger from "../utils/logger";

let cachedConnection: Promise<typeof mongoose> | null = null;

const connectDB = async () => {
  if (cachedConnection) {
    return cachedConnection;
  }

  // IF ALREADY CONNECTED, RETURN IMMEDIATELY
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not set in environment");
    }

    cachedConnection = mongoose.connect(process.env.MONGO_URI as string, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    const connection = await cachedConnection;
    logger.info(`MongoDB Connected @ ${mongoose.connection.host}`);
    return connection;
  } catch (e) {
    logger.error("MongoDB Connection Error: ", e);
    cachedConnection = null; // RESET CACHE ON ERROR

    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }

    throw e;
  }
};

export default connectDB;
