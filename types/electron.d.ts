// electron.d.ts
export {};

declare global {
  interface Window {
    electron?: {
      platform: string;
      openFolderDialog: () => Promise<string | null>;
    };
  }
}