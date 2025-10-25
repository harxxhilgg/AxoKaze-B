import dotenv from "dotenv";
dotenv.config();

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
import MongoStore from "connect-mongo";

const app = express();

app.set("trust proxy", 1);

const PORT = process.env.PORT || 10000;

connectDB();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"], // FRONTEND-ORIGIN
    credentials: true, // ALLOW COOKIES TO BE SENT
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
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 7 * 24 * 60 * 60,
      autoRemove: "native",
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 DAYS
    },
  })
);

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  logger.info(`API is accessible @ http://localhost:${PORT}/api`);
});
