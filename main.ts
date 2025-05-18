// main.ts
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { exec } from 'child_process';

let mainWindow: BrowserWindow | null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.ts') // optional
    }
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  exec('npm run start'); // start next.js build
  setTimeout(createWindow, 3000); // wait before loading browser
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});