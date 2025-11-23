import dotenv from "dotenv";
dotenv.config();

import express, { Request } from "express";
import { ServerResponse } from "http";
import connectDB from "./config/db";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes";
import logger from "./utils/logger";
import morgan from "morgan";

const app = express();

// TRUST PROXY FOR VERCEL DEPLOYMENT
app.set("trust proxy", 1);

const PORT = process.env.PORT || 10000;
const isDev = process.env.NODE_ENV === "development";

// INITIALIZE DB CONNECTION
connectDB().catch((err) => {
  logger.error("Initial database connection failed: ", err);
});

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://axokaze.vercel.app", // DEPLOYED API URI
    ],
    credentials: true, // ALLOW COOKIES TO BE SENT
  })
);

app.use(express.json());
app.use(cookieParser()); // FOR JWT COOKIES

let chalk: any = null;
if (isDev) {
  try {
    chalk = require("chalk");
  } catch (error) {
    logger.error("Chalk not available, no problem.");
  }
}

morgan.token("status-code", (req: Request, res: ServerResponse) => {
  const status = (res as ServerResponse).statusCode ?? 0;
  const statusStr = String(status);

  // USE COLORS ONLY IN DEVELOPMENT WHEN CHALK IS AVAILABLE
  if (chalk) {
    return status >= 200 && status < 300
      ? chalk.green(statusStr)
      : chalk.red(statusStr);
  }

  return statusStr;
});

const morganFormat = ":method :url ~ :status-code";

app.use(
  morgan(morganFormat, {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (e) {
    logger.error("Database connection failed: ", e);

    res.status(503).json({
      message: "Database temporarily unavailable. Please try again later.",
    });
  }
});

app.use("/api/auth", authRoutes);

// ROUTE HEALTH CHECK
app.get("/", (req, res) => {
  res.json({ message: "API is running", status: "ok" });
});

app.get("/api", (req, res) => {
  res.json({ message: "API endpoint is working." });
});

// ONLY LISTEN ON LOCAL DEVELOPMENT
// if (process.env.NODE_ENV === "development") {
//   app.listen(PORT, () => {
//     logger.info(`API is accessible @ http://localhost:${PORT}/api`);
//   });
// }

app.listen(PORT, () => {
  if (isDev) {
    logger.info(`API is accessible @ http://localhost:${PORT}/api`);
  } else {
    logger.info(`API is accessible @ https://axokaze.vercel.app/api`);
  };
});

// FOR VERCEL
export default app;
