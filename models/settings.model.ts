export interface AppSettings {
  playlistFolderPath: string;
}

export type SettingsUpdateDTO = Partial<AppSettings>;