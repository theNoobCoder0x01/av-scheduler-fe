export interface AppSettings {
  playlistFolderPath: string;
  playerMode: "vlc" | "built-in";
  mediaPlayerWindowBehavior: "close-existing" | "skip-if-open";
  allowMultipleMediaWindows: boolean;
  mediaPlayerWindowTimeout: number; // Timeout in seconds for window operations
  mediaPlayerAutoFocus: boolean;
  sleepWakeBufferMinutes: number; // Minutes before next action to wake from sleep (2-10)
}

export type SettingsUpdateDTO = Partial<AppSettings>;
