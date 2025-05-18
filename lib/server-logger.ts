// lib/serverLogger.ts
const logDir = "./logs";

let winstonLogger: any;
if (typeof window === "undefined") {
  const { createLogger, format, transports } = require("winston");
  const path = require("path");

  winstonLogger = createLogger({
    level: "info",
    format: format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.errors({ stack: true }),
      format.splat(),
      format.json()
    ),
    transports: [
      new transports.File({
        filename: path.join(logDir, "error.log"),
        level: "error",
      }),
      new transports.File({
        filename: path.join(logDir, "debug.log"),
        level: "debug",
      }),
      new transports.File({
        filename: path.join(logDir, "warn.log"),
        level: "warn",
      }),
      new transports.File({
        filename: path.join(logDir, "info.log"),
        level: "info",
      }),
      new transports.File({
        filename: path.join(logDir, "help.log"),
        level: "help",
      }),
      new transports.File({ filename: path.join(logDir, "combined.log") }),
    ],
  });

  // Log to console as well in development
  // if (process.env.NODE_ENV !== "production") {
  //   logger.add(new transports.Console({ format: format.simple() }));
  // }
}

export default winstonLogger;
