import cors from "cors";
import express from "express";
import { createServer, Server } from "http";
import path from "path";
import { WebSocketServer } from "ws";
import { setupWebSocket } from "./lib/web-socket";
import { discoverStaticRoutes, createRouteHandlers, createSmartFallbackHandler } from "./lib/route-discovery";
import calendarEventsRouter from "./routes/calender-events";
import schedulerRoutes from "./routes/scheduler";
import settingsRouter from "./routes/settings";
import playlistsRouter from "./routes/playlists";
import mediaRouter from "./routes/media";
import fileBrowserRouter from "./routes/file-browser";
import playerControlRouter from "./routes/player-control";

const app = express();
const apiServer: Server = createServer(app);
const PORT = 8082;

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/scheduler", schedulerRoutes);
app.use("/api/calendar-events", calendarEventsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/playlists", playlistsRouter);
app.use("/api/media", mediaRouter);
app.use("/api/files", fileBrowserRouter);
app.use("/api/player", playerControlRouter);

// Static file serving setup
const outDir = path.join(__dirname, "..", "..", "out");
console.log(`📁 Static files directory: ${outDir}`);

// Serve static assets
app.use("/_next", express.static(path.join(outDir, "_next")));
app.use("/favicon.ico", express.static(path.join(outDir, "favicon.ico")));

// 🚀 FULLY AUTOMATED ROUTING SYSTEM
function setupAutomatedRouting() {
  console.log("🔧 Setting up automated routing system...");
  
  // Discover all static routes
  const discoveredRoutes = discoverStaticRoutes(outDir);
  
  if (discoveredRoutes.length === 0) {
    console.warn("⚠️ No static routes discovered. Make sure Next.js has been built with static export.");
    return;
  }

  // Create route handlers for all discovered routes
  createRouteHandlers(app, discoveredRoutes);
  
  // Set up smart fallback handler for any unmatched routes
  app.get(/^(?!\/api).*/, createSmartFallbackHandler(outDir, discoveredRoutes));
  
  console.log("✅ Automated routing system configured successfully!");
  console.log(`📊 Total routes configured: ${discoveredRoutes.length}`);
}

// Initialize automated routing
setupAutomatedRouting();

export const startServer = (callback: () => any) => {
  apiServer.listen(PORT, () => {
    console.info(`🚀 Local API server running at http://localhost:${PORT}`);
    console.info(`📁 Static files served from: ${outDir}`);
    console.info(`🤖 Fully automated routing enabled - no manual route configuration needed!`);
    if (callback) callback();
  });

  apiServer.on("error", (error) => {
    console.error("❌ Error starting server:", error);
  });

  const webSocketServer: WebSocketServer = setupWebSocket(apiServer);
  console.log("📡 WebSocket server is running", apiServer.address());

  return {
    apiServer,
    webSocketServer,
  };
};