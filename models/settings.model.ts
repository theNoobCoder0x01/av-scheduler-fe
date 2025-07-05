export interface AppSettings {
  playlistFolderPath: string;
  playerMode: "vlc" | "built-in";
}

export type SettingsUpdateDTO = Partial<AppSettings>;
