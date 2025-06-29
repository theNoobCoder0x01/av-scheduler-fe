import { startServer } from "./index";

// Standalone API server for local development
console.log("🚀 Starting BAPS Music Scheduler API Server...");
console.log("📍 Environment: Development");
console.log("🌐 API will be available at: http://localhost:8082/api");
console.log("🎵 Media streaming at: http://localhost:8082/api/media");
console.log("📁 File browser at: http://localhost:8082/api/files");
console.log("🎮 Player control at: http://localhost:8082/api/player");
console.log("📡 WebSocket server will be running on the same port");
console.log("");

startServer(() => {
  console.log("✅ API Server is ready!");
  console.log("💡 You can now run 'npm run dev' in another terminal for the frontend");
  console.log("🔗 Full app will be available at: http://localhost:3000");
  console.log("");
  console.log("📋 Available endpoints:");
  console.log("  - GET  /api/calendar-events");
  console.log("  - GET  /api/scheduler");
  console.log("  - GET  /api/settings");
  console.log("  - GET  /api/playlists");
  console.log("  - GET  /api/media/stream/:encodedPath");
  console.log("  - GET  /api/files/browse");
  console.log("  - GET  /api/player/state");
  console.log("");
});