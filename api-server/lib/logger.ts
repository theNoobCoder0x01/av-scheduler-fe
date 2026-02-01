import fs from "fs";
import path from "path";
import { APP_CONFIG_DIR } from "./settings";

// Log levels
export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

// Configuration
const LOG_FILE_NAME = "app.log";
const MAX_LOG_SIZE_MB = 10; // Maximum log file size in MB
const MAX_LOG_FILES = 5; // Maximum number of rotated log files

class Logger {
  private static instance: Logger;
  private logFilePath: string;
  private logLevel: LogLevel = "info";
  private writeStream: fs.WriteStream | null = null;
  private initialized = false;

  private constructor() {
    this.logFilePath = path.join(APP_CONFIG_DIR, LOG_FILE_NAME);
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Initialize the logger - creates log directory and file if needed
   */
  public initialize(): void {
    if (this.initialized) return;

    try {
      // Ensure the config directory exists
      if (!fs.existsSync(APP_CONFIG_DIR)) {
        fs.mkdirSync(APP_CONFIG_DIR, { recursive: true });
      }

      // Check if log rotation is needed
      this.rotateLogsIfNeeded();

      // Open write stream in append mode
      this.writeStream = fs.createWriteStream(this.logFilePath, { flags: "a" });

      this.initialized = true;
      this.info("Logger", "Logger initialized", { logPath: this.logFilePath });
    } catch (error) {
      console.error("Failed to initialize logger:", error);
    }
  }

  /**
   * Set the minimum log level
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Get the current log file path
   */
  public getLogFilePath(): string {
    return this.logFilePath;
  }

  /**
   * Debug level log
   */
  public debug(category: string, message: string, data?: any): void {
    this.log("debug", category, message, data);
  }

  /**
   * Info level log
   */
  public info(category: string, message: string, data?: any): void {
    this.log("info", category, message, data);
  }

  /**
   * Warning level log
   */
  public warn(category: string, message: string, data?: any): void {
    this.log("warn", category, message, data);
  }

  /**
   * Error level log
   */
  public error(category: string, message: string, data?: any): void {
    this.log("error", category, message, data);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, category: string, message: string, data?: any): void {
    // Check if we should log this level
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    // Format the log line
    const logLine = this.formatLogEntry(entry);

    // Write to file
    this.writeToFile(logLine);

    // Also output to console with appropriate method
    this.writeToConsole(entry);
  }

  /**
   * Check if the given level should be logged based on current log level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  /**
   * Format a log entry as a string
   */
  private formatLogEntry(entry: LogEntry): string {
    const levelStr = entry.level.toUpperCase().padEnd(5);
    let line = `[${entry.timestamp}] [${levelStr}] [${entry.category}] ${entry.message}`;

    if (entry.data !== undefined) {
      try {
        const dataStr = JSON.stringify(entry.data, this.jsonReplacer, 0);
        line += ` | ${dataStr}`;
      } catch (error) {
        line += ` | [Unable to stringify data]`;
      }
    }

    return line + "\n";
  }

  /**
   * JSON replacer function to handle circular references and special types
   */
  private jsonReplacer(key: string, value: any): any {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }
    if (typeof value === "function") {
      return "[Function]";
    }
    return value;
  }

  /**
   * Write to the log file
   */
  private writeToFile(line: string): void {
    if (!this.initialized) {
      this.initialize();
    }

    if (this.writeStream) {
      this.writeStream.write(line);
    } else {
      // Fallback to synchronous write if stream not available
      try {
        fs.appendFileSync(this.logFilePath, line);
      } catch (error) {
        console.error("Failed to write to log file:", error);
      }
    }
  }

  /**
   * Write to console with appropriate colors
   */
  private writeToConsole(entry: LogEntry): void {
    const prefix = `[${entry.category}]`;
    const message = entry.message;
    const data = entry.data;

    switch (entry.level) {
      case "debug":
        if (data !== undefined) {
          console.debug(prefix, message, data);
        } else {
          console.debug(prefix, message);
        }
        break;
      case "info":
        if (data !== undefined) {
          console.log(prefix, message, data);
        } else {
          console.log(prefix, message);
        }
        break;
      case "warn":
        if (data !== undefined) {
          console.warn(prefix, message, data);
        } else {
          console.warn(prefix, message);
        }
        break;
      case "error":
        if (data !== undefined) {
          console.error(prefix, message, data);
        } else {
          console.error(prefix, message);
        }
        break;
    }
  }

  /**
   * Rotate logs if the current log file exceeds the maximum size
   */
  private rotateLogsIfNeeded(): void {
    try {
      if (!fs.existsSync(this.logFilePath)) return;

      const stats = fs.statSync(this.logFilePath);
      const sizeInMB = stats.size / (1024 * 1024);

      if (sizeInMB >= MAX_LOG_SIZE_MB) {
        this.rotateLogs();
      }
    } catch (error) {
      console.error("Error checking log file size:", error);
    }
  }

  /**
   * Rotate log files
   */
  private rotateLogs(): void {
    try {
      // Close current write stream if open
      if (this.writeStream) {
        this.writeStream.end();
        this.writeStream = null;
      }

      // Delete the oldest log file if it exists
      const oldestLog = `${this.logFilePath}.${MAX_LOG_FILES}`;
      if (fs.existsSync(oldestLog)) {
        fs.unlinkSync(oldestLog);
      }

      // Rename existing log files (shift numbers up)
      for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
        const currentName = `${this.logFilePath}.${i}`;
        const newName = `${this.logFilePath}.${i + 1}`;
        if (fs.existsSync(currentName)) {
          fs.renameSync(currentName, newName);
        }
      }

      // Rename current log file to .1
      if (fs.existsSync(this.logFilePath)) {
        fs.renameSync(this.logFilePath, `${this.logFilePath}.1`);
      }

      console.log("Log files rotated successfully");
    } catch (error) {
      console.error("Error rotating log files:", error);
    }
  }

  /**
   * Get recent log entries (reads from file)
   */
  public async getRecentLogs(lines: number = 100): Promise<string[]> {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return [];
      }

      const content = fs.readFileSync(this.logFilePath, "utf-8");
      const allLines = content.split("\n").filter((line) => line.trim());
      return allLines.slice(-lines);
    } catch (error) {
      console.error("Error reading log file:", error);
      return [];
    }
  }

  /**
   * Clear all logs
   */
  public clearLogs(): void {
    try {
      if (this.writeStream) {
        this.writeStream.end();
        this.writeStream = null;
      }

      if (fs.existsSync(this.logFilePath)) {
        fs.writeFileSync(this.logFilePath, "");
      }

      // Also delete rotated logs
      for (let i = 1; i <= MAX_LOG_FILES; i++) {
        const rotatedLog = `${this.logFilePath}.${i}`;
        if (fs.existsSync(rotatedLog)) {
          fs.unlinkSync(rotatedLog);
        }
      }

      // Reinitialize the write stream
      this.initialized = false;
      this.initialize();

      this.info("Logger", "Logs cleared");
    } catch (error) {
      console.error("Error clearing logs:", error);
    }
  }

  /**
   * Shutdown the logger gracefully
   */
  public shutdown(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
    this.initialized = false;
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Initialize on module load
logger.initialize();

// Graceful shutdown
process.on("SIGINT", () => {
  logger.shutdown();
});

process.on("SIGTERM", () => {
  logger.shutdown();
});
