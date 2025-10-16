import dotenv from "dotenv";
import express, { Request } from "express";
import { ServerResponse } from "http";
import connectDB from "./config/db";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import authRoutes from "./routes/authRoutes";
import logger from "./utils/logger";
import morgan from "morgan";
import chalk from "chalk";

dotenv.config({ path: ".env" });

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

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

app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in prod (w/ HTTPS)
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  logger.info(`API is accessible @ http://localhost:${PORT}/api`);
});
