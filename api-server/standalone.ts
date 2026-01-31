import cors from "cors";
import express from "express";
import { createServer, Server } from "http";
import { WebSocketServer } from "ws";
import { initializeDB } from "./lib/db";
import { setupWebSocket } from "./lib/web-socket";
import calendarEventsRouter from "./routes/calender-events";
import fileBrowserRouter from "./routes/file-browser";
import mediaRouter from "./routes/media";
import playerControlRouter from "./routes/player-control";
import playlistsRouter from "./routes/playlists";
import schedulerRoutes from "./routes/scheduler";
import settingsRouter from "./routes/settings";
import systemRouter from "./routes/system";

const app = express();
const apiServer: Server = createServer(app);
const PORT = 8082;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// API Routes
app.use("/api/scheduler", schedulerRoutes);
app.use("/api/calendar-events", calendarEventsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/playlists", playlistsRouter);
app.use("/api/media", mediaRouter);
app.use("/api/files", fileBrowserRouter);
app.use("/api/player", playerControlRouter);
app.use("/api/system", systemRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "BAPS Music Scheduler API is running",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "BAPS Music Scheduler API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/api/health",
      calendar: "/api/calendar-events",
      scheduler: "/api/scheduler",
      settings: "/api/settings",
      playlists: "/api/playlists",
      media: "/api/media",
      files: "/api/files",
      player: "/api/player",
      system: "/api/system",
    },
  });
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("API Error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  },
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

let webSocketServer: WebSocketServer | null = null;
let isShuttingDown = false;

export const startStandaloneServer = async () => {
  try {
    // Initialize database
    console.log("🗄️  Initializing database...");
    await initializeDB();
    console.log("✅ Database initialized");

    // Start server
    apiServer.listen(PORT, () => {
      console.log(
        `🚀 BAPS Music Scheduler API Server running at http://localhost:${PORT}`,
      );
      console.log(`📋 API endpoints available at http://localhost:${PORT}/api`);
      console.log(`🎵 Media streaming at http://localhost:${PORT}/api/media`);
      console.log(`📁 File browser at http://localhost:${PORT}/api/files`);
      console.log(`🎮 Player control at http://localhost:${PORT}/api/player`);
      console.log(`💊 Health check at http://localhost:${PORT}/api/health`);
    });

    apiServer.on("error", (error) => {
      console.error("❌ Error starting server:", error);
      process.exit(1);
    });

    // Setup WebSocket
    webSocketServer = setupWebSocket(apiServer);
    console.log("📡 WebSocket server is running");

    // Enhanced graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      if (isShuttingDown) {
        console.log("🔄 Shutdown already in progress...");
        return;
      }

      isShuttingDown = true;
      console.log(`🛑 ${signal} received, shutting down gracefully...`);

      // Close WebSocket server first
      if (webSocketServer) {
        console.log("📡 Closing WebSocket server...");
        webSocketServer.close(() => {
          console.log("✅ WebSocket server closed");
        });
      }

      // Close HTTP server
      console.log("🌐 Closing HTTP server...");
      apiServer.close((err) => {
        if (err) {
          console.error("❌ Error closing server:", err);
          process.exit(1);
        } else {
          console.log("✅ HTTP server closed");
          console.log("👋 Server shutdown complete");
          process.exit(0);
        }
      });

      // Force exit after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        console.log("⚠️  Forcing shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    // Handle different termination signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGUSR2", () => gracefulShutdown("SIGUSR2")); // nodemon restart

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught Exception:", error);
      gracefulShutdown("UNCAUGHT_EXCEPTION");
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
      gracefulShutdown("UNHANDLED_REJECTION");
    });

    return {
      apiServer,
      webSocketServer,
    };
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start server if this file is run directly
if (require.main === module) {
  console.log("🚀 Starting BAPS Music Scheduler API Server...");
  console.log("📍 Environment: Development");
  console.log("");

  startStandaloneServer()
    .then(() => {
      console.log("");
      console.log("✅ API Server is ready!");
      console.log(
        "💡 You can now run 'npm run dev' in another terminal for the frontend",
      );
      console.log("🔗 Full app will be available at: http://localhost:3000");
      console.log("🛑 Press Ctrl+C to stop the server");
      console.log("");
    })
    .catch((error) => {
      console.error("❌ Failed to start server:", error);
      process.exit(1);
    });
}
