import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { Server } from "http";
import * as path from "path";
import { WebSocketServer } from "ws";
import { startServer } from "./api-server";

let mainWindow: BrowserWindow | null = null;
let servers: {
  apiServer?: Server | null | undefined;
  webSocketServer?: WebSocketServer | null | undefined;
} = { apiServer: null, webSocketServer: null };

/**
 * Starts the API server as a child process.
 */
function startApiServer() {
  // console.log("Starting API server...", process.execPath);
  // const isPackaged = app.isPackaged;
  // const basePath = isPackaged
  //   ? path.join(process.resourcesPath, "app.asar.unpacked")
  //   : __dirname;
  // const apiPath = path.join(basePath, "api-server", "index.js");
  // console.log("apiPath", apiPath);
  // apiProcess = spawn("node", [apiPath], { stdio: "inherit" });
  // apiProcess.on("error", (err: Error) => {
  //   console.error("Failed to start API server:", err);
  // });
  // apiProcess;
  servers = startServer(() => {
    // Start Express server first
    createMainWindow(); // Then create the Electron window
  });
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

  // In production, load the built Next.js app
  mainWindow.loadURL("http://localhost:8082");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("open-folder-dialog", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
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
