import cors from "cors";
import express from "express";
import { createServer, Server } from "http";
import path from "path";
import { WebSocketServer } from "ws";
import { setupWebSocket } from "./lib/web-socket";
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

app.use("/api/scheduler", schedulerRoutes);
app.use("/api/calendar-events", calendarEventsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/playlists", playlistsRouter);
app.use("/api/media", mediaRouter);
app.use("/api/files", fileBrowserRouter);
app.use("/api/player", playerControlRouter);

// Serve static files from the Next.js export
const outDir = path.join(__dirname, "..", "..", "out");
console.log(`\n\n${outDir}\n\n`);

app.use(express.static(outDir));

// For any route not handled by API or static, serve index.html (SPA fallback)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(outDir, "index.html"));
});

export const startServer = (callback: () => any) => {
  apiServer.listen(PORT, () => {
    console.info(`Local API server running at http://localhost:${PORT}`);
    if (callback) callback();
  });

  apiServer.on("error", (error) => {
    console.error("Error starting server:", error);
  });

  const webSocketServer: WebSocketServer = setupWebSocket(apiServer);
  console.log("WebSocket server is running", apiServer.address());

  return {
    apiServer,
    webSocketServer,
  };
};