/**
 * Enhanced Electron Window Manager for Media Player Windows
 * 
 * This module provides robust window lifecycle management for media player windows,
 * ensuring proper independence from the main window and handling multiple window scenarios.
 */

import { BrowserWindow, ipcMain, app, shell } from 'electron';
import { getSettings } from '../api-server/lib/settings';
import { broadcast } from '../api-server/lib/web-socket';

interface MediaPlayerWindow {
  id: number;
  window: BrowserWindow;
  playlistPath?: string;
  isReady: boolean;
  createdAt: number;
  lastActivity: number;
}

interface WindowManagerOptions {
  allowMultiple: boolean;
  timeout: number;
  autoFocus: boolean;
}

class ElectronWindowManager {
  private mediaPlayerWindows: Map<number, MediaPlayerWindow> = new Map();
  private mainWindow: BrowserWindow | null = null;
  private options: WindowManagerOptions;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private windowCreationQueue: Array<() => void> = [];
  private isProcessingQueue = false;

  constructor() {
    this.options = this.loadOptionsFromSettings();
    this.setupIpcHandlers();
    this.startCleanupTimer();
    
    // Update options when settings change
    this.setupSettingsListener();
  }

  private loadOptionsFromSettings(): WindowManagerOptions {
    const settings = getSettings();
    return {
      allowMultiple: settings.allowMultipleMediaWindows || false,
      timeout: (settings.mediaPlayerWindowTimeout || 5) * 1000,
      autoFocus: settings.mediaPlayerAutoFocus !== false,
    };
  }

  private setupSettingsListener() {
    // Listen for settings changes via IPC
    ipcMain.on('settings-updated', () => {
      this.options = this.loadOptionsFromSettings();
      console.log('📱 Window manager options updated:', this.options);
    });
  }

  private setupIpcHandlers() {
    // Handle media player window requests
    ipcMain.handle('open-media-player', async (event, playlistPath?: string, autoPlay = false) => {
      return this.openMediaPlayerWindow(playlistPath, autoPlay);
    });

    ipcMain.handle('close-media-player', async () => {
      return this.closeAllMediaPlayerWindows();
    });

    ipcMain.handle('get-media-player-status', async () => {
      return this.getMediaPlayerStatus();
    });

    ipcMain.handle('check-media-player-exists', async () => {
      return this.hasActiveMediaPlayerWindow();
    });

    // Handle window ready notifications
    ipcMain.on('media-player-ready', (event) => {
      const windowId = event.sender.id;
      const mediaWindow = this.mediaPlayerWindows.get(windowId);
      if (mediaWindow) {
        mediaWindow.isReady = true;
        mediaWindow.lastActivity = Date.now();
        console.log(`🎵 Media player window ${windowId} is ready`);
      }
    });

    // Handle window activity updates
    ipcMain.on('media-player-activity', (event) => {
      const windowId = event.sender.id;
      const mediaWindow = this.mediaPlayerWindows.get(windowId);
      if (mediaWindow) {
        mediaWindow.lastActivity = Date.now();
      }
    });
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  public async openMediaPlayerWindow(playlistPath?: string, autoPlay = false): Promise<{
    success: boolean;
    message: string;
    windowId?: number;
    action?: 'opened' | 'skipped' | 'replaced';
  }> {
    try {
      const settings = getSettings();
      const hasExisting = this.hasActiveMediaPlayerWindow();

      // Handle existing window based on settings
      if (hasExisting && !this.options.allowMultiple) {
        if (settings.mediaPlayerWindowBehavior === 'skip-if-open') {
          console.log('🚫 Skipping media player action - window already open');
          return {
            success: false,
            message: 'Media player window already open, action skipped',
            action: 'skipped'
          };
        } else if (settings.mediaPlayerWindowBehavior === 'close-existing') {
          console.log('🔄 Closing existing media player windows before opening new one');
          await this.closeAllMediaPlayerWindows();
        }
      }

      // Queue window creation to prevent race conditions
      return new Promise((resolve) => {
        this.windowCreationQueue.push(() => {
          this.createMediaPlayerWindow(playlistPath, autoPlay)
            .then(resolve)
            .catch((error) => {
              console.error('❌ Error creating media player window:', error);
              resolve({
                success: false,
                message: `Failed to create media player window: ${error.message}`,
              });
            });
        });

        this.processWindowCreationQueue();
      });
    } catch (error) {
      console.error('❌ Error in openMediaPlayerWindow:', error);
      return {
        success: false,
        message: `Failed to open media player window: ${(error as Error).message}`,
      };
    }
  }

  private async processWindowCreationQueue() {
    if (this.isProcessingQueue || this.windowCreationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    
    while (this.windowCreationQueue.length > 0) {
      const createWindow = this.windowCreationQueue.shift();
      if (createWindow) {
        await createWindow();
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.isProcessingQueue = false;
  }

  private async createMediaPlayerWindow(playlistPath?: string, autoPlay = false): Promise<{
    success: boolean;
    message: string;
    windowId?: number;
    action: 'opened' | 'replaced';
  }> {
    const mediaPlayerWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: require.resolve('../preload.js'), // Assuming you have a preload script
      },
      title: 'BAPS Music Player',
      icon: this.getAppIcon(),
      show: false, // Don't show immediately
      // Make window independent from main window
      parent: undefined,
      modal: false,
      // Window behavior
      alwaysOnTop: false,
      skipTaskbar: false,
      // macOS specific
      titleBarStyle: process.platform === 'darwin' ? 'default' : undefined,
      // Windows specific
      autoHideMenuBar: true,
    });

    // Store window reference
    const windowInfo: MediaPlayerWindow = {
      id: mediaPlayerWindow.id,
      window: mediaPlayerWindow,
      playlistPath,
      isReady: false,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    
    this.mediaPlayerWindows.set(mediaPlayerWindow.id, windowInfo);

    // Setup window event handlers
    this.setupWindowEventHandlers(mediaPlayerWindow, windowInfo);

    // Load the media player URL
    const mediaPlayerUrl = this.getMediaPlayerUrl(playlistPath, autoPlay);
    await mediaPlayerWindow.loadURL(mediaPlayerUrl);

    // Show window after loading
    mediaPlayerWindow.once('ready-to-show', () => {
      mediaPlayerWindow.show();
      
      if (this.options.autoFocus) {
        mediaPlayerWindow.focus();
        mediaPlayerWindow.moveTop();
      }
      
      console.log(`🎵 Media player window ${mediaPlayerWindow.id} opened successfully`);
    });

    // Broadcast window opened event
    broadcast({
      type: 'mediaPlayerWindowOpened',
      data: {
        windowId: mediaPlayerWindow.id,
        playlistPath,
        autoPlay,
        timestamp: Date.now(),
      },
    });

    return {
      success: true,
      message: `Media player window opened successfully${playlistPath ? ` with playlist: ${playlistPath}` : ''}`,
      windowId: mediaPlayerWindow.id,
      action: 'opened',
    };
  }

  private setupWindowEventHandlers(window: BrowserWindow, windowInfo: MediaPlayerWindow) {
    // Handle window closed
    window.on('closed', () => {
      console.log(`🔒 Media player window ${window.id} closed`);
      this.mediaPlayerWindows.delete(window.id);
      
      // Broadcast window closed event
      broadcast({
        type: 'mediaPlayerWindowClosed',
        data: {
          windowId: window.id,
          timestamp: Date.now(),
        },
      });
    });

    // Handle window focus
    window.on('focus', () => {
      windowInfo.lastActivity = Date.now();
    });

    // Handle window blur
    window.on('blur', () => {
      windowInfo.lastActivity = Date.now();
    });

    // Handle navigation attempts (security)
    window.webContents.on('will-navigate', (event, url) => {
      // Only allow navigation within the app
      if (!url.startsWith(this.getBaseUrl())) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });

    // Handle new window attempts
    window.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Handle window unresponsive
    window.on('unresponsive', () => {
      console.warn(`⚠️ Media player window ${window.id} became unresponsive`);
      // Optionally close unresponsive windows after timeout
      setTimeout(() => {
        if (!window.isDestroyed()) {
          console.log(`🔒 Closing unresponsive media player window ${window.id}`);
          window.destroy();
        }
      }, this.options.timeout);
    });

    // Handle page title updates
    window.on('page-title-updated', (event, title) => {
      if (windowInfo.playlistPath) {
        const playlistName = require('path').basename(windowInfo.playlistPath, '.m3u');
        window.setTitle(`BAPS Music Player - ${playlistName}`);
      }
    });
  }

  public async closeAllMediaPlayerWindows(): Promise<{
    success: boolean;
    message: string;
    closedCount: number;
  }> {
    const windowIds = Array.from(this.mediaPlayerWindows.keys());
    let closedCount = 0;

    for (const windowId of windowIds) {
      try {
        await this.closeMediaPlayerWindow(windowId);
        closedCount++;
      } catch (error) {
        console.error(`❌ Error closing media player window ${windowId}:`, error);
      }
    }

    // Also broadcast stop command to any remaining windows
    broadcast({
      type: 'mediaPlayerCommand',
      command: 'stop',
      data: {},
    });

    console.log(`🔒 Closed ${closedCount} media player windows`);

    return {
      success: true,
      message: `Closed ${closedCount} media player windows`,
      closedCount,
    };
  }

  public async closeMediaPlayerWindow(windowId: number): Promise<boolean> {
    const windowInfo = this.mediaPlayerWindows.get(windowId);
    if (!windowInfo || windowInfo.window.isDestroyed()) {
      return false;
    }

    try {
      // Gracefully close the window
      if (!windowInfo.window.isDestroyed()) {
        windowInfo.window.close();
      }
      return true;
    } catch (error) {
      console.error(`❌ Error closing media player window ${windowId}:`, error);
      // Force destroy if graceful close fails
      if (!windowInfo.window.isDestroyed()) {
        windowInfo.window.destroy();
      }
      return false;
    }
  }

  public hasActiveMediaPlayerWindow(): boolean {
    for (const [windowId, windowInfo] of this.mediaPlayerWindows) {
      if (!windowInfo.window.isDestroyed()) {
        return true;
      }
    }
    return false;
  }

  public getActiveMediaPlayerWindows(): MediaPlayerWindow[] {
    const activeWindows: MediaPlayerWindow[] = [];
    
    for (const [windowId, windowInfo] of this.mediaPlayerWindows) {
      if (!windowInfo.window.isDestroyed()) {
        activeWindows.push(windowInfo);
      } else {
        // Clean up destroyed windows
        this.mediaPlayerWindows.delete(windowId);
      }
    }
    
    return activeWindows;
  }

  public getMediaPlayerStatus() {
    const activeWindows = this.getActiveMediaPlayerWindows();
    
    return {
      hasActiveWindow: activeWindows.length > 0,
      activeWindowCount: activeWindows.length,
      windows: activeWindows.map(w => ({
        id: w.id,
        playlistPath: w.playlistPath,
        isReady: w.isReady,
        createdAt: w.createdAt,
        lastActivity: w.lastActivity,
      })),
      allowMultiple: this.options.allowMultiple,
      windowBehavior: getSettings().mediaPlayerWindowBehavior,
    };
  }

  private startCleanupTimer() {
    // Clean up stale windows every 30 seconds
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleWindows();
    }, 30000);
  }

  private cleanupStaleWindows() {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes of inactivity

    for (const [windowId, windowInfo] of this.mediaPlayerWindows) {
      if (windowInfo.window.isDestroyed()) {
        console.log(`🧹 Cleaning up destroyed window ${windowId}`);
        this.mediaPlayerWindows.delete(windowId);
      } else if (now - windowInfo.lastActivity > staleThreshold) {
        console.log(`🧹 Cleaning up stale window ${windowId} (inactive for ${Math.round((now - windowInfo.lastActivity) / 1000)}s)`);
        windowInfo.window.close();
      }
    }
  }

  private getMediaPlayerUrl(playlistPath?: string, autoPlay = false): string {
    const baseUrl = this.getBaseUrl();
    const params = new URLSearchParams();
    
    if (playlistPath) {
      params.set('playlist', playlistPath);
    }
    if (autoPlay) {
      params.set('autoplay', 'true');
    }
    
    return `${baseUrl}/media-player${params.toString() ? `?${params.toString()}` : ''}`;
  }

  private getBaseUrl(): string {
    // In development, use localhost
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3000';
    }
    
    // In production, use the built app URL
    return `file://${require('path').join(__dirname, '../renderer/index.html')}`;
  }

  private getAppIcon(): string | undefined {
    // Return appropriate icon path based on platform
    const iconPath = require('path').join(__dirname, '../assets/icons');
    
    switch (process.platform) {
      case 'win32':
        return require('path').join(iconPath, 'icon.ico');
      case 'darwin':
        return require('path').join(iconPath, 'icon.icns');
      default:
        return require('path').join(iconPath, 'icon.png');
    }
  }

  public async destroy() {
    console.log('🔒 Shutting down Electron Window Manager');
    
    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Close all media player windows
    await this.closeAllMediaPlayerWindows();

    // Clear window references
    this.mediaPlayerWindows.clear();
    this.mainWindow = null;
  }

  // Static method to create singleton instance
  private static instance: ElectronWindowManager | null = null;
  
  public static getInstance(): ElectronWindowManager {
    if (!ElectronWindowManager.instance) {
      ElectronWindowManager.instance = new ElectronWindowManager();
    }
    return ElectronWindowManager.instance;
  }
}

// Export singleton instance
export const electronWindowManager = ElectronWindowManager.getInstance();

// Export for use in main Electron process
export { ElectronWindowManager };