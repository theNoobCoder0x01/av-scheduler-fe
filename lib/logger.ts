// lib/logger.ts
const isServer = typeof window === "undefined";
let serverLogger: any;
if (isServer) {
  // Use require to avoid importing server-only code in client bundle
  serverLogger = require("./server-logger").default;
}

const savedConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  help: (console as any).help,
};

const formatArg = (arg: any) =>
  typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg);

export const logger = {
  log: (...args: any[]) => {
    const message = args.map(formatArg).join(" ");
    isServer ? serverLogger.info(message) : savedConsole.log("[LOG]", ...args);
  },
  info: (...args: any[]) => {
    const message = args.map(formatArg).join(" ");
    isServer
      ? serverLogger.info(message)
      : savedConsole.info("[INFO]", ...args);
  },
  warn: (...args: any[]) => {
    const message = args.map(formatArg).join(" ");
    isServer
      ? serverLogger.warn(message)
      : savedConsole.warn("[WARN]", ...args);
  },
  error: (...args: any[]) => {
    const message = args.map(formatArg).join(" ");
    isServer
      ? serverLogger.error(message)
      : savedConsole.error("[ERROR]", ...args);
  },
  debug: (...args: any[]) => {
    const message = args.map(formatArg).join(" ");
    isServer
      ? serverLogger.debug(message)
      : savedConsole.debug("[DEBUG]", ...args);
  },
  help: (...args: any[]) => {
    const message = args.map(formatArg).join(" ");
    isServer
      ? (serverLogger.help ?? serverLogger.info)(message)
      : savedConsole.log("[HELP]", ...args);
  },
};
