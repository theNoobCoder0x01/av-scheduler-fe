// electron.d.ts
export {};

declare global {
  interface Window {
    electron?: {
      platform: string;
      openFolderDialog: () => Promise<string | null>;
      openMediaPlayer: (playlistPath?: string) => Promise<void>;
      closeMediaPlayer: () => Promise<void>;
      onLoadPlaylist: (callback: (playlistPath: string) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}