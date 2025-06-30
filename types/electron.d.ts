// electron.d.ts
export {};

declare global {
  interface Window {
    electron?: {
      platform: string;
      openFolderDialog: () => Promise<string | null>;
      openMediaPlayer: (playlistPath?: string, autoPlay?: boolean) => Promise<void>;
      closeMediaPlayer: () => Promise<void>;
      onLoadPlaylist: (callback: (data: { playlistPath: string; autoPlay: boolean }) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}