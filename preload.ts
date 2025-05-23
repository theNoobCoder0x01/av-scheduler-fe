import { contextBridge } from 'electron';

// Expose any APIs to the renderer process here
contextBridge.exposeInMainWorld('electron', {
  // Add any functions you want to expose
  platform: process.platform
});