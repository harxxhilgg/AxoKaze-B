import winston from "winston";

const { combine, timestamp, colorize, printf, align } = winston.format;

const env = process.env.NODE_ENV || "development";
const isDev = env === "development";

const logFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

const logger = winston.createLogger({
  level: isDev ? "debug" : "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    align(),
    isDev ? colorize() : winston.format.uncolorize(),
    logFormat
  ),
  transports: [new winston.transports.Console()],
});

if (!isDev) {
  logger.add(
    new winston.transports.File({
      filename: "app.log",
      level: "info",
      format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
    })
  );
}

export default logger;
