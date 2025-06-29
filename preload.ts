import { contextBridge, ipcRenderer } from 'electron';

// Expose any APIs to the renderer process here
contextBridge.exposeInMainWorld('electron', {
  // Add any functions you want to expose
  platform: process.platform,
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  openMediaPlayer: (playlistPath?: string) => ipcRenderer.invoke('open-media-player', playlistPath),
  closeMediaPlayer: () => ipcRenderer.invoke('close-media-player'),
  
  // Listen for playlist loading events
  onLoadPlaylist: (callback: (playlistPath: string) => void) => {
    ipcRenderer.on('load-playlist', (event, playlistPath) => callback(playlistPath));
  },
  
  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});