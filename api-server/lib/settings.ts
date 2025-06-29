import { AppSettings } from "@/models/settings.model";
import fs from "fs";
import os from "os";
import path from "path";

// Define the settings directory in the user's home folder
export const APP_CONFIG_DIR = path.join(os.homedir(), ".baps-scheduler");
// Define the full path to the settings file
const SETTINGS_FILE = path.join(APP_CONFIG_DIR, "settings.json");

// Default settings - consider if playlistFolderPath should also be user-specific
// For now, it remains as per the original code.
const defaultSettings: AppSettings = {
  playlistFolderPath: path.join(APP_CONFIG_DIR, "playlists"),
  playerMode: 'vlc', // Default to VLC player
};

/**
 * Ensures that the settings directory exists.
 * If it doesn't exist, it creates the directory.
 */
function ensureSettingsDirExists() {
  try {
    if (!fs.existsSync(APP_CONFIG_DIR)) {
      fs.mkdirSync(APP_CONFIG_DIR, { recursive: true });
    }
  } catch (error) {
    console.error("Error creating settings directory:", error);
    // Depending on the desired behavior, you might want to throw here
    // or handle it in a way that allows the application to proceed (or fail gracefully).
  }
}

/**
 * Gets the current settings.
 * Reads from the settings file in the user's .baps-scheduler folder.
 * If the file doesn't exist, it creates it with default settings.
 */
export function getSettings(): AppSettings {
  try {
    ensureSettingsDirExists();
    if (!fs.existsSync(SETTINGS_FILE)) {
      // If settings file doesn't exist, write default settings and return them
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
      return defaultSettings;
    }
    // If it exists, read it, parse it, and merge with defaults (defaults act as a fallback)
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    return { ...defaultSettings, ...settings };
  } catch (error) {
    console.error("Error reading settings:", error);
    // Return default settings as a fallback in case of read/parse errors
    return defaultSettings;
  }
}

/**
 * Updates the settings.
 * Merges the new settings with the current settings and writes them to the file.
 * @param {Partial<AppSettings>} newSettings - An object containing the settings to update.
 * @throws {Error} Throws an error if writing to the settings file fails.
 */
export function updateSettings(newSettings: Partial<AppSettings>) {
  try {
    ensureSettingsDirExists();
    const currentSettings = getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updatedSettings, null, 2));
    return updatedSettings;
  } catch (error) {
    console.error("Error updating settings:", error);
    throw error; // Re-throw the error so the caller can handle it
  }
}