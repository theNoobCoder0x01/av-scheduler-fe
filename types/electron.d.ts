// electron.d.ts
export {};

declare global {
  interface Window {
    electron?: {
      platform: string;
      openFolderDialog: () => Promise<string | null>;
      
      // Legacy media player APIs (maintained for compatibility)
      openMediaPlayer: (
        playlistPath?: string,
        autoPlay?: boolean,
      ) => Promise<void>;
      closeMediaPlayer: () => Promise<void>;
      onLoadPlaylist: (
        callback: (data: { playlistPath: string; autoPlay: boolean }) => void,
      ) => void;
      removeAllListeners: (channel: string) => void;
      
      // Enhanced window manager APIs
      openMediaPlayerWindow: (
        playlistPath?: string,
        autoPlay?: boolean,
      ) => Promise<{
        success: boolean;
        message: string;
        windowId?: number;
        action?: 'opened' | 'skipped' | 'replaced';
      }>;
      closeAllMediaPlayerWindows: () => Promise<{
        success: boolean;
        message: string;
        closedCount: number;
      }>;
      getMediaPlayerStatus: () => Promise<{
        hasActiveWindow: boolean;
        activeWindowCount: number;
        windows: Array<{
          id: number;
          playlistPath?: string;
          isReady: boolean;
          createdAt: number;
          lastActivity: number;
        }>;
        allowMultiple: boolean;
        windowBehavior: 'close-existing' | 'skip-if-open';
      }>;
      checkMediaPlayerExists: () => Promise<boolean>;
      
      // Settings notifications
      notifySettingsUpdate: () => void;
      
      // Media player window event listeners
      onMediaPlayerWindowOpened: (
        callback: (data: {
          windowId: number;
          playlistPath?: string;
          autoPlay: boolean;
          timestamp: number;
        }) => void,
      ) => void;
      onMediaPlayerWindowClosed: (
        callback: (data: {
          windowId: number;
          timestamp: number;
        }) => void,
      ) => void;
      onMediaPlayerReady: (
        callback: (data: { windowId: number }) => void,
      ) => void;
      
      // Action monitoring
      onScheduledActionExecuted: (
        callback: (data: {
          action: string;
          playlistName?: string;
          result: { success: boolean; message: string };
          timestamp: number;
        }) => void,
      ) => void;
      onScheduledActionSkipped: (
        callback: (data: {
          action: string;
          playlistName?: string;
          reason: string;
          timestamp: number;
        }) => void,
      ) => void;
    };
  }
  
  interface Global {
    electronWindowManager?: {
      openMediaPlayerWindow: (
        playlistPath?: string,
        autoPlay?: boolean,
      ) => Promise<{
        success: boolean;
        message: string;
        windowId?: number;
        action?: 'opened' | 'skipped' | 'replaced';
      }>;
      closeAllMediaPlayerWindows: () => Promise<{
        success: boolean;
        message: string;
        closedCount: number;
      }>;
      getMediaPlayerStatus: () => any;
      hasActiveMediaPlayerWindow: () => boolean;
    };
    electronAPI?: {
      openMediaPlayer: (playlistPath?: string, autoPlay?: boolean) => void;
      closeMediaPlayer: () => void;
      checkMediaPlayerExists?: () => Promise<boolean>;
    };
  }
}
