import { contextBridge, ipcRenderer } from 'electron';

// Expose any APIs to the renderer process here
contextBridge.exposeInMainWorld('electron', {
  // Add any functions you want to expose
  platform: process.platform,
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  openMediaPlayer: (playlistPath?: string, autoPlay?: boolean) => ipcRenderer.invoke('open-media-player', playlistPath, autoPlay),
  closeMediaPlayer: () => ipcRenderer.invoke('close-media-player'),
  
  // Listen for playlist loading events
  onLoadPlaylist: (callback: (data: { playlistPath: string; autoPlay: boolean }) => void) => {
    ipcRenderer.on('load-playlist', (event, data) => callback(data));
  },
  
  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});