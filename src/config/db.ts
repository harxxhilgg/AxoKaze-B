import mongoose from "mongoose";
import logger from "../utils/logger";

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      logger.error(
        "MONGO_URI is not set in environment. Skipping MongoDB connection."
      );
      return;
    }

    const connect = await mongoose.connect(process.env.MONGO_URI as string);

    logger.info(`MongoDB Connected @ ${connect.connection.host}`);
  } catch (e) {
    logger.error("MongoDB Connection Error: ", e);

    process.exit(1);
  }
};

export default connectDB;
