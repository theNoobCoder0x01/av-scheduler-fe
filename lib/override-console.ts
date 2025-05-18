// lib/overrideConsole.ts
import { logger } from "./logger";

export const overrideConsole = () => {
  console.log = (...args) => logger.log(...args);
  console.info = (...args) => logger.info(...args);
  console.warn = (...args) => logger.warn(...args);
  console.error = (...args) => logger.error(...args);
  console.debug = (...args) => logger.debug(...args);
  (console as any).help = (...args: any[]) => logger.help(...args);
};
