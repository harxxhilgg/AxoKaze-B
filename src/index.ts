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
import chalk from "chalk";

const app = express();

const PORT = process.env.PORT || 10000;

connectDB();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"], // FRONTEND-ORIGIN
    credentials: true, // ALLOW COOKIES TO BE SENT
  })
);

app.use(express.json());
app.use(cookieParser()); // FOR JWT COOKIES

morgan.token("colored-status", (req: Request, res: ServerResponse) => {
  const status = (res as ServerResponse).statusCode ?? 0;
  const statusStr = String(status);
  return status >= 200 && status < 300
    ? chalk.green(statusStr)
    : chalk.red(statusStr);
});

const morganFormat = ":method :url ~ :colored-status";

app.use(
  morgan(morganFormat, {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  logger.info(`API is accessible @ http://localhost:${PORT}/api`);
});
