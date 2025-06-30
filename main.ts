import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { Server } from "http";
import * as path from "path";
import { WebSocketServer } from "ws";
import { startServer } from "./api-server";

let mainWindow: BrowserWindow | null = null;
let mediaPlayerWindow: BrowserWindow | null = null;
let servers: {
  apiServer?: Server | null | undefined;
  webSocketServer?: WebSocketServer | null | undefined;
} = { apiServer: null, webSocketServer: null };

/**
 * Starts the API server as a child process.
 */
function startApiServer() {
  servers = startServer(() => {
    // Start Express server first
    createMainWindow(); // Then create the Electron window
    
    // Set up global API for the backend to communicate with Electron
    setupGlobalElectronAPI();
  });
}

/**
 * Sets up global API for backend to communicate with Electron
 */
function setupGlobalElectronAPI() {
  (global as any).electronAPI = {
    openMediaPlayer: (playlistPath: string, autoPlay: boolean = false) => {
      console.log("🎵 Electron API: Opening media player with playlist:", playlistPath, "autoPlay:", autoPlay);
      createMediaPlayerWindow(playlistPath, autoPlay);
    },
    closeMediaPlayer: () => {
      console.log("🔒 Electron API: Closing media player window");
      if (mediaPlayerWindow) {
        mediaPlayerWindow.close();
        mediaPlayerWindow = null;
      }
    }
  };
}

/**
 * Creates the main Electron browser window.
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // In production, load the built-in Next.js app
  mainWindow.loadURL("http://localhost:8082");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Creates a media player window for the built-in player
 */
function createMediaPlayerWindow(playlistPath?: string, autoPlay: boolean = false) {
  console.log("🎵 Creating media player window with playlist:", playlistPath, "autoPlay:", autoPlay);
  
  // Close existing media player window if open
  if (mediaPlayerWindow) {
    console.log("🔄 Closing existing media player window");
    mediaPlayerWindow.close();
  }

  mediaPlayerWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    title: "BAPS Media Player",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    // Make it a separate window
    parent: mainWindow || undefined,
    modal: false,
    show: false, // Don't show until ready
  });

  // CRITICAL FIX: Always load the media-player page, not the main app
  let mediaPlayerUrl = `http://localhost:8082/media-player`;
  
  if (playlistPath) {
    const params = new URLSearchParams({
      playlist: playlistPath,
      autoPlay: autoPlay.toString()
    });
    mediaPlayerUrl += `?${params.toString()}`;
  }
  
  console.log("🌐 Loading media player URL:", mediaPlayerUrl);
  mediaPlayerWindow.loadURL(mediaPlayerUrl);

  // Show window when ready
  mediaPlayerWindow.once('ready-to-show', () => {
    console.log("✅ Media player window ready, showing and focusing");
    mediaPlayerWindow?.show();
    mediaPlayerWindow?.focus();
  });

  mediaPlayerWindow.on("closed", () => {
    console.log("🔒 Media player window closed");
    mediaPlayerWindow = null;
  });

  // Set up communication between main and media player windows
  mediaPlayerWindow.webContents.on('did-finish-load', () => {
    console.log("📄 Media player page loaded");
    if (playlistPath) {
      console.log("📡 Sending playlist data to media player window");
      // Send playlist path and auto-play flag to the media player window
      mediaPlayerWindow?.webContents.send('load-playlist', {
        playlistPath,
        autoPlay
      });
    }
  });

  // Debug: Log navigation events
  mediaPlayerWindow.webContents.on('did-navigate', (event, url) => {
    console.log("🧭 Media player navigated to:", url);
  });

  mediaPlayerWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error("❌ Media player failed to load:", errorCode, errorDescription, validatedURL);
  });
}

ipcMain.handle("open-folder-dialog", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
});

// Handle media player window creation from renderer process
ipcMain.handle("open-media-player", async (event, playlistPath?: string, autoPlay: boolean = false) => {
  createMediaPlayerWindow(playlistPath, autoPlay);
});

ipcMain.handle("close-media-player", async () => {
  if (mediaPlayerWindow) {
    mediaPlayerWindow.close();
    mediaPlayerWindow = null;
  }
});

/**
 * Clean up child processes on app quit.
 */
function cleanupProcesses() {
  if (servers.apiServer) {
    servers.apiServer.close();
    servers.apiServer = null;
  }
  if (servers.webSocketServer) {
    servers.webSocketServer.close();
    servers.webSocketServer = null;
  }
}

// App lifecycle events
app.on("ready", () => {
  startApiServer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

app.on("before-quit", () => {
  cleanupProcesses();
});