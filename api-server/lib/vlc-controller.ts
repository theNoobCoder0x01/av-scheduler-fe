import axios from "axios";
import { ChildProcess, exec, spawn } from "child_process";
import path from "path";
import { ICalendarEvent } from "../../models/calendar-event.model";
import { ActionType } from "../../models/scheduled-action.model";
import { CalendarEventsService } from "../services/calendar-events.service";
import { getSettings } from "./settings";
import { broadcast } from "./web-socket";

let vlcProcess: ChildProcess | null = null;
let currentPlaylist: string | null = null;
const VLC_PATH =
  process.platform === "win32"
    ? "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe"
    : "vlc";

// VLC HTTP Interface configuration
const VLC_HTTP_HOST = "localhost";
const VLC_HTTP_PORT = 8083;
const VLC_HTTP_PASSWORD = "vlc"; // Default VLC password
const USE_HTTP_INTERFACE = true; // Toggle between HTTP and CLI control

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

async function getCurrentEvent(): Promise<ICalendarEvent | undefined> {
  const response = await CalendarEventsService.getCurrentCalendarEvent();

  if (!response || response.length === 0) {
    return undefined;
  }

  return (response as ICalendarEvent[])[0];
}

function isVlcRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform === "win32") {
      exec('tasklist | find /i "vlc.exe"', (error, stdout) => {
        resolve(stdout.toLowerCase().includes("vlc.exe"));
      });
    } else {
      exec("pgrep vlc", (error, stdout) => {
        resolve(!!stdout.trim());
      });
    }
  });
}

async function sendHttpCommand(
  command: string,
): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Sending HTTP command to VLC: " + command);
    const auth = Buffer.from(`:${VLC_HTTP_PASSWORD}`).toString("base64");

    const response = await axios.get(
      `http://${VLC_HTTP_HOST}:${VLC_HTTP_PORT}/requests/status.json?command=${command}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
        timeout: 5000, // 5 second timeout
      },
    );

    return {
      success: true,
      message: `Command ${command} executed successfully`,
    };
  } catch (error) {
    console.error("HTTP command error:", error);
    return {
      success: false,
      message: `Failed to execute command: ${error}`,
    };
  }
}

/**
 * Generates possible M3U filenames for events with slash-separated tithi names
 * For "12 Sud Chaudas/Punam", it returns:
 * 1. "12 Sud Chaudas.m3u" (first part)
 * 2. "12 Sud Punam.m3u" (second part)
 * 3. "12 Sud Chaudas/Punam.m3u" (original with slash)
 */
function generatePlaylistFilenames(eventName: string): string[] {
  if (!eventName) return [];

  // Clean the event name for file system compatibility
  const cleanName = eventName.replace(/[<>:"|?*]/g, "_");

  // Check if the event name contains a slash
  if (cleanName.includes("/")) {
    const filenames: string[] = [];

    // Extract the prefix (everything before the last space before the slash)
    const slashIndex = cleanName.indexOf("/");
    const beforeSlash = cleanName.substring(0, slashIndex);
    const afterSlash = cleanName.substring(slashIndex + 1);

    // Find the last space before the slash to get the prefix
    const lastSpaceIndex = beforeSlash.lastIndexOf(" ");
    const prefix =
      lastSpaceIndex !== -1 ? beforeSlash.substring(0, lastSpaceIndex + 1) : "";
    const firstTithi =
      lastSpaceIndex !== -1
        ? beforeSlash.substring(lastSpaceIndex + 1)
        : beforeSlash;

    // 1. First tithi: "12 Sud Chaudas.m3u"
    filenames.push(`${prefix}${firstTithi}.m3u`);

    // 2. Second tithi: "12 Sud Punam.m3u"
    filenames.push(`${prefix}${afterSlash.trim()}.m3u`);

    // 3. Original with slash: "12 Sud Chaudas/Punam.m3u"
    filenames.push(`${cleanName}.m3u`);

    return filenames;
  } else {
    // No slash, return single filename
    return [`${cleanName}.m3u`];
  }
}

/**
 * Checks if a file exists
 */
function fileExists(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const fs = require("fs");
    fs.access(filePath, fs.constants.F_OK, (err: any) => {
      resolve(!err);
    });
  });
}

/**
 * Finds the first existing playlist file from possible filenames
 */
async function findPlaylistFile(
  playlistName: string,
  playlistFolderPath: string,
): Promise<string | null> {
  const possibleFilenames = generatePlaylistFilenames(playlistName);

  console.log(`Looking for playlist files for "${playlistName}":`);

  for (const filename of possibleFilenames) {
    const filePath = path.join(playlistFolderPath, filename);
    console.log(`  Checking: ${filePath}`);

    if (await fileExists(filePath)) {
      console.log(`  ✓ Found: ${filePath}`);
      return filePath;
    } else {
      console.log(`  ✗ Not found: ${filePath}`);
    }
  }

  console.log(`  No playlist file found for "${playlistName}"`);
  return null;
}

async function playPlaylistVLC(
  playlistName: string,
): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Playing playlist with VLC: " + playlistName);

    if (!playlistName) {
      return {
        success: false,
        message: "Playlist name is required for play action",
      };
    }

    const settings = getSettings();

    // Find the first existing playlist file
    const filePath = await findPlaylistFile(
      playlistName,
      settings.playlistFolderPath,
    );

    if (!filePath) {
      const possibleFilenames = generatePlaylistFilenames(playlistName);
      return {
        success: false,
        message: `No playlist file found for "${playlistName}". Tried: ${possibleFilenames.join(", ")}`,
      };
    }

    if (USE_HTTP_INTERFACE) {
      console.log("Using HTTP interface to control VLC");

      // Start VLC with HTTP interface if not running
      const vlcRunning = await isVlcRunning();
      console.log("VLC running: " + vlcRunning);

      if (!vlcRunning) {
        console.log("[HELP] Starting VLC with HTTP interface");
        if (process.platform === "win32") {
          // Start VLC with HTTP interface
          vlcProcess = spawn(VLC_PATH, [
            "--extraintf=http",
            `--http-host=${VLC_HTTP_HOST}`,
            `--http-port=${VLC_HTTP_PORT}`,
            `--http-password=${VLC_HTTP_PASSWORD}`,
            filePath,
          ]);
        } else {
          // Start VLC with HTTP interface
          vlcProcess = spawn("open", [
            "-a",
            VLC_PATH,
            "--args",
            "--extraintf=http",
            `--http-host=${VLC_HTTP_HOST}`,
            `--http-port=${VLC_HTTP_PORT}`,
            `--http-password=${VLC_HTTP_PASSWORD}`,
            filePath,
          ]);
        }

        vlcProcess?.stdout?.on?.("data", (data) => {
          console.log(`[HELP] VLC stdout: ${data}`);
        });

        vlcProcess?.stderr?.on?.("data", (data) => {
          console.log(`[HELP] VLC stderr: ${data}`);
        });

        vlcProcess?.on("close", (code) => {
          console.log(`[HELP] VLC process exited with code ${code}`);
        });
      } else {
        console.log("VLC is already running, sending HTTP command");
        // If VLC is running, use HTTP command to load playlist
        return await sendHttpCommand(
          `in_play&input=${encodeURIComponent(filePath)}`,
        );
      }
    } else {
      // Use CLI control
      const vlcRunning = await isVlcRunning();
      if (vlcProcess) {
        vlcProcess.kill();
        vlcProcess = null;
      }

      if (!vlcRunning) {
        vlcProcess = spawn(VLC_PATH, [filePath, "--play-and-pause"], {
          detached: true,
          stdio: "ignore",
        });
        vlcProcess.unref();
      } else {
        exec(`${VLC_PATH} --intf rc ${filePath}`, (error) => {
          if (error) {
            console.error("Error loading playlist:", error);
          }
        });
      }
    }

    currentPlaylist = path.basename(filePath);
    return {
      success: true,
      message: `Started playing playlist: ${currentPlaylist}`,
    };
  } catch (error) {
    console.error("Error in playPlaylist:", error);
    return {
      success: false,
      message: `Failed to play playlist: ${(error as Error).message}`,
    };
  }
}

async function playPlaylistBuiltIn(
  playlistName: string,
): Promise<{ success: boolean; message: string }> {
  try {
    console.log("🎵 Playing playlist with built-in player:", playlistName);

    if (!playlistName) {
      return {
        success: false,
        message: "Playlist name is required for play action",
      };
    }

    const settings = getSettings();

    // Find the first existing playlist file
    const filePath = await findPlaylistFile(
      playlistName,
      settings.playlistFolderPath,
    );

    if (!filePath) {
      const possibleFilenames = generatePlaylistFilenames(playlistName);
      return {
        success: false,
        message: `No playlist file found for "${playlistName}". Tried: ${possibleFilenames.join(", ")}`,
      };
    }

    console.log("🎵 Found playlist file:", filePath);

    let globalObject = global as any;

    // Signal Electron to open media player window with auto-play
    if (globalObject.electronAPI) {
      console.log("🎵 Opening media player via Electron API");
      globalObject.electronAPI.openMediaPlayer(filePath, true); // true for auto-play
    }

    // Also broadcast to any existing media player windows
    console.log("🎵 Broadcasting loadAndPlay command via WebSocket");
    broadcast({
      type: "mediaPlayerCommand",
      command: "loadAndPlay",
      data: {
        playlistPath: filePath,
        autoPlay: true,
      },
    });

    return {
      success: true,
      message: `Opening built-in player with playlist: ${path.basename(filePath)}`,
    };
  } catch (error) {
    console.error("❌ Error in playPlaylistBuiltIn:", error);
    return {
      success: false,
      message: `Failed to play playlist with built-in player: ${(error as Error).message}`,
    };
  }
}

async function pauseBuiltIn(): Promise<{ success: boolean; message: string }> {
  try {
    console.log("⏸️ Sending pause command to built-in player");

    // Broadcast pause command to all media player windows
    broadcast({
      type: "mediaPlayerCommand",
      command: "pause",
      data: {},
    });

    return {
      success: true,
      message: "Pause command sent to built-in player",
    };
  } catch (error) {
    console.error("❌ Error pausing built-in player:", error);
    return {
      success: false,
      message: `Failed to pause built-in player: ${(error as Error).message}`,
    };
  }
}

async function pauseVlc(): Promise<{ success: boolean; message: string }> {
  try {
    if (USE_HTTP_INTERFACE) {
      return await sendHttpCommand("pl_pause");
    } else {
      if (process.platform === "win32") {
        exec(`${VLC_PATH} --intf dummy vlc://pause`);
      } else {
        exec(`${VLC_PATH} --intf dummy vlc://pause`);
      }
    }
    return {
      success: true,
      message: "Playback paused",
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to pause playback: ${(error as Error).message}`,
    };
  }
}

async function stopBuiltIn(): Promise<{ success: boolean; message: string }> {
  try {
    console.log("⏹️ Sending stop command to built-in player");

    // Broadcast stop command to all media player windows
    broadcast({
      type: "mediaPlayerCommand",
      command: "stop",
      data: {},
    });

    // Also signal Electron to close media player windows
    let globalObject = global as any;
    if (globalObject.electronAPI) {
      console.log("🔒 Closing media player windows via Electron API");
      globalObject.electronAPI.closeMediaPlayer();
    }

    return {
      success: true,
      message: "Stop command sent to built-in player and windows closed",
    };
  } catch (error) {
    console.error("❌ Error stopping built-in player:", error);
    return {
      success: false,
      message: `Failed to stop built-in player: ${(error as Error).message}`,
    };
  }
}

async function stopVlc(
  { killProcess = false }: { killProcess: boolean } = { killProcess: false },
): Promise<{ success: boolean; message: string }> {
  try {
    console.log("[HELP] Stopping VLC playback");
    console.log("[HELP] Is Http interface: ", USE_HTTP_INTERFACE);
    console.log("[HELP] Kill process: ", killProcess);
    console.log("[HELP] VLC process: ", vlcProcess);
    console.log(
      "[HELP] Will try to quit app: ",
      killProcess || !USE_HTTP_INTERFACE,
    );

    let httpRes;
    if (USE_HTTP_INTERFACE) {
      httpRes = await sendHttpCommand("pl_stop");
    }
    if (killProcess || !USE_HTTP_INTERFACE) {
      if (vlcProcess) {
        vlcProcess.kill();
        vlcProcess = null;
        currentPlaylist = null;
      }
      if (process.platform === "win32") {
        exec("taskkill /IM vlc.exe /F");
      } else {
        exec("pkill -f VLC");
      }
    }
    if (httpRes && !httpRes.success) {
      return httpRes;
    }
    return {
      success: true,
      message: "Playback stopped",
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to stop playback: ${(error as Error).message}`,
    };
  }
}

export async function controlVlc(
  action: ActionType,
  playlistName?: string,
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(
      "🎮 Controlling media with action:",
      action,
      "for playlist:",
      playlistName,
    );

    // For daily actions, we need to find the current event
    if (!playlistName) {
      const currentEvent = await getCurrentEvent();
      console.log("Current event: " + currentEvent);
      if (!currentEvent && action === "play") {
        return {
          success: false,
          message: "No active event found for the current time",
        };
      }
      playlistName = currentEvent?.summary;
      console.log("Playlist name by current event: " + playlistName);
    }

    console.log("🎮 Final playlist name:", playlistName);

    // Get settings to determine player mode
    const settings = getSettings();
    const playerMode = settings.playerMode || "vlc";

    console.log("🎮 Using player mode:", playerMode);

    switch (action) {
      case "play":
        if (playerMode === "built-in") {
          return await playPlaylistBuiltIn(playlistName || "");
        } else {
          return await playPlaylistVLC(playlistName || "");
        }
      case "pause":
        if (playerMode === "built-in") {
          return await pauseBuiltIn();
        } else {
          return await pauseVlc();
        }
      case "stop":
        if (playerMode === "built-in") {
          return await stopBuiltIn();
        } else {
          return await stopVlc({ killProcess: true });
        }
      default:
        return {
          success: false,
          message: `Unknown action: ${action}`,
        };
    }
  } catch (error: Error | any) {
    console.error("❌ Error controlling media:", error);

    return {
      success: false,
      message: error.message,
    };
  }
}

// Export the generatePlaylistFilenames function for use in other modules
export { generatePlaylistFilenames };
