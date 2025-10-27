import mongoose from "mongoose";
import logger from "../utils/logger";

let isConnected = false;

const connectDB = async () => {
  // IF ALREADY CONNECTED, REUSE THE CONNECTION
  if (isConnected && mongoose.connection.readyState === 1) {
    logger.info("MongoDB: Using existing connection.");
    return;
  }

  try {
    if (!process.env.MONGO_URI) {
      logger.error(
        "MONGO_URI is not set in environment. Skipping MongoDB connection."
      );
      return;
    }

    // SET MONGOOSE TO NOT BUFFER COMMANDS
    mongoose.set("bufferCommands", false);

    const connect = await mongoose.connect(process.env.MONGO_URI as string, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, // USE IPv4, SKIP TRYING IPv6
    });

    isConnected = true;
    logger.info(`MongoDB Connected @ ${connect.connection.host}`);
  } catch (e) {
    logger.error("MongoDB Connection Error: ", e);
    isConnected = false;
    // DON'T EXIT IN SERVERLESS ~ JUST LOG THE ERROR
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
    throw e;
  }
};

export default connectDB;
