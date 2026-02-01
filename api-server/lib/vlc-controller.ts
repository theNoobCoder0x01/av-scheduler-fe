import axios from "axios";
import { ChildProcess, exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);
import { ICalendarEvent } from "../../models/calendar-event.model";
import { ActionType } from "../../models/scheduled-action.model";
import { CalendarEventsService } from "../services/calendar-events.service";
import { getSettings } from "./settings";
import { broadcast } from "./web-socket";
import { getSleepCapabilities } from "./sleep-mode-detector";
import {
  scheduleWakeTimer,
  isRunningAsAdmin,
  deleteWakeTimer,
} from "./wake-timer-scheduler";
import { SchedulerService } from "../services/scheduler.service";
import { logger } from "./logger";

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

    // Use the global electron window manager if available
    let globalObject = global as any;
    let windowManagerResult = null;

    // First check if we have the enhanced window manager available
    if (globalObject.electronWindowManager) {
      console.log("🎵 Using enhanced window manager");
      try {
        windowManagerResult = await globalObject.electronWindowManager.openMediaPlayerWindow(filePath, true);
        
        if (windowManagerResult.success) {
          return {
            success: true,
            message: windowManagerResult.message,
          };
        } else if (windowManagerResult.action === 'skipped') {
          // Action was skipped due to user settings
          return {
            success: false,
            message: windowManagerResult.message,
          };
        }
      } catch (error) {
        console.error("❌ Error with enhanced window manager:", error);
        // Fall back to legacy method
      }
    }

    // Fallback to legacy Electron API if window manager is not available
    if (globalObject.electronAPI) {
      console.log("🎵 Using legacy Electron API");
      
      // Check if we should skip based on settings and existing windows
      if (settings.mediaPlayerWindowBehavior === 'skip-if-open') {
        // Try to check if a window is already open
        try {
          const hasWindow = await globalObject.electronAPI.checkMediaPlayerExists?.();
          if (hasWindow) {
            console.log("🚫 Skipping - media player window already open (legacy check)");
            return {
              success: false,
              message: "Media player window already open, action skipped",
            };
          }
        } catch (error) {
          console.log("⚠️ Could not check for existing windows, proceeding...");
        }
      }

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

    // Broadcast notification about the action
    broadcast({
      type: "scheduledAction",
      action: "play",
      playlistName,
      timestamp: Date.now(),
      result: windowManagerResult || { success: true, action: 'opened' },
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

    // Also broadcast action notification
    broadcast({
      type: "scheduledAction",
      action: "pause",
      timestamp: Date.now(),
      result: { success: true },
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

    let globalObject = global as any;
    let windowManagerResult = null;

    // Use enhanced window manager if available
    if (globalObject.electronWindowManager) {
      console.log("🔒 Closing media player windows via enhanced window manager");
      try {
        windowManagerResult = await globalObject.electronWindowManager.closeAllMediaPlayerWindows();
      } catch (error) {
        console.error("❌ Error with enhanced window manager during stop:", error);
      }
    }

    // Fallback to legacy method
    if (globalObject.electronAPI) {
      console.log("🔒 Closing media player windows via legacy Electron API");
      globalObject.electronAPI.closeMediaPlayer();
    }

    // Broadcast stop command to all media player windows
    broadcast({
      type: "mediaPlayerCommand",
      command: "stop",
      data: {},
    });

    // Broadcast action notification
    broadcast({
      type: "scheduledAction",
      action: "stop",
      timestamp: Date.now(),
      result: windowManagerResult || { success: true },
    });

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

/**
 * Executes the Windows sleep command with proper error handling
 * @returns Promise that resolves when sleep command is executed
 * @throws Error if sleep command fails
 */
async function executeSleepCommand(): Promise<void> {
  console.log("[Sleep] Executing sleep command...");
  try {
    // SetSuspendState parameters:
    // 0 = Sleep mode (not hibernate)
    // 1 = Force sleep (override wake locks)
    // 1 = Enable wake events (allows wake timers to work)
    await execAsync("rundll32.exe powrprof.dll,SetSuspendState 0,1,1");
    console.log("[Sleep] Sleep command executed successfully");
  } catch (error) {
    console.error("[Sleep] Failed to execute sleep command:", error);
    throw new Error(
      `Sleep command execution failed: ${(error as Error).message}`,
    );
  }
}

/**
 * Simplified sleep function - just puts the computer to sleep.
 * Wake scheduling is now handled separately via the wake action.
 */
async function sleepWindows(): Promise<{
  success: boolean;
  message: string;
  requiresElevation?: boolean;
  requiresConfirmation?: boolean;
  warningMessage?: string;
}> {
  try {
    logger.info("Sleep", "Initiating Windows sleep mode");

    // Check if running on Windows
    if (process.platform !== "win32") {
      logger.warn("Sleep", "Sleep mode not supported on this platform", { platform: process.platform });
      return {
        success: false,
        message: "Sleep mode is only supported on Windows operating systems",
      };
    }

    // Detect sleep capabilities for logging purposes
    logger.debug("Sleep", "Detecting sleep mode capabilities...");
    const capabilities = await getSleepCapabilities();

    // Format sleep mode name with variant
    const getSleepModeName = () => {
      const mode = capabilities.supportedMode;
      if (mode === "S0" && capabilities.states?.s0?.variant) {
        return `S0 Modern Standby (${capabilities.states.s0.variant})`;
      } else if (mode === "S0") {
        return "S0 Modern Standby";
      } else if (mode === "S3") {
        return "S3 Traditional Sleep";
      } else if (mode === "S1") {
        return "S1 Sleep";
      } else if (mode === "S2") {
        return "S2 Sleep";
      } else if (mode === "S4") {
        return "S4 Hibernate";
      }
      return mode;
    };

    logger.info("Sleep", "Detected sleep capabilities", {
      mode: getSleepModeName(),
      rtcWake: capabilities.supportsRTCWake,
      canAutoWake: capabilities.canAutoWakeup,
      wakeDevices: capabilities.wakeArmedDevices?.length || 0,
    });

    // Execute sleep command
    logger.info("Sleep", "Putting computer to sleep...");
    try {
      await executeSleepCommand();
      logger.info("Sleep", "Sleep command executed successfully");
      return {
        success: true,
        message: "Computer entering sleep mode",
      };
    } catch (error) {
      logger.error("Sleep", "Failed to execute sleep command", { error: (error as Error).message });
      return {
        success: false,
        message: `Failed to initiate sleep mode: ${(error as Error).message}`,
      };
    }
  } catch (error) {
    logger.error("Sleep", "Error in sleep mode execution", { error: (error as Error).message });
    return {
      success: false,
      message: `Failed to initiate sleep mode: ${(error as Error).message}`,
    };
  }
}

/**
 * Schedules a wake timer for the computer.
 * This creates a Windows Task Scheduler task that will wake the computer at the scheduled time.
 */
async function wakeWindows(): Promise<{
  success: boolean;
  message: string;
  requiresElevation?: boolean;
  wakeTime?: Date;
}> {
  try {
    logger.info("Wake", "Scheduling wake timer");

    // Check if running on Windows
    if (process.platform !== "win32") {
      logger.warn("Wake", "Wake timer not supported on this platform", { platform: process.platform });
      return {
        success: false,
        message: "Wake timers are only supported on Windows operating systems",
      };
    }

    // Check admin privileges
    const isAdmin = await isRunningAsAdmin();
    logger.debug("Wake", "Admin privileges check", { isAdmin });

    if (!isAdmin) {
      logger.warn("Wake", "Not running as administrator");
      return {
        success: false,
        message: "Administrator privileges required to schedule wake timer. Please run the application as Administrator.",
        requiresElevation: true,
      };
    }

    // Check sleep capabilities
    const capabilities = await getSleepCapabilities();

    if (!capabilities.canAutoWakeup) {
      let reason = "";
      if (!capabilities.supportsRTCWake) {
        reason = "RTC wake timers are not supported on this system.";
      } else if (capabilities.requiresAdminForWakeTimers) {
        reason = "Administrator privileges are required to configure wake timers.";
      } else {
        reason = "Auto-wake capability could not be verified.";
      }

      logger.warn("Wake", "Auto-wake not supported", { reason });
      return {
        success: false,
        message: `Wake timer cannot be scheduled: ${reason}`,
      };
    }

    // Get the action's scheduled time - the wake timer should fire AT this action's time
    // Since this is the wake action itself, we need to get the current action's next run time
    // For now, we schedule the wake timer for "now" - meaning when this action triggers,
    // the wake timer task is created to wake the system at the scheduled wake action time

    // The wake action itself IS the scheduled wake time - when this action's scheduler fires,
    // the computer should already be awake (the wake timer triggers the wake)
    // So we need to schedule the wake timer for the NEXT occurrence of this action

    // Get all wake actions to find the next one
    const allActions = await SchedulerService.getAllScheduledActions();
    const wakeActions = allActions.filter(
      (action) => action.isActive && action.actionType === "wake",
    );

    if (wakeActions.length === 0) {
      logger.info("Wake", "No active wake actions found, wake timer set for immediate");
      return {
        success: true,
        message: "Wake action executed - system is awake",
      };
    }

    // Find the next wake action after now
    const now = Date.now() / 1000;
    const futureWakeActions = wakeActions
      .filter((action) => action.nextRun && action.nextRun > now)
      .sort((a, b) => (a.nextRun || 0) - (b.nextRun || 0));

    if (futureWakeActions.length === 0) {
      logger.info("Wake", "No future wake actions scheduled");
      return {
        success: true,
        message: "Wake action executed - system is awake. No future wake timers to schedule.",
      };
    }

    // Schedule wake timer for the next wake action
    const nextWakeAction = futureWakeActions[0];
    const wakeTime = new Date((nextWakeAction.nextRun || 0) * 1000);

    logger.info("Wake", "Scheduling wake timer", {
      wakeTime: wakeTime.toISOString(),
      actionId: nextWakeAction.id,
    });

    const wakeResult = await scheduleWakeTimer(wakeTime);

    if (!wakeResult.success) {
      logger.error("Wake", "Failed to schedule wake timer", { message: wakeResult.message });

      if (wakeResult.requiresElevation) {
        return {
          success: false,
          message: wakeResult.message,
          requiresElevation: true,
        };
      }

      return {
        success: false,
        message: `Failed to schedule wake timer: ${wakeResult.message}`,
      };
    }

    logger.info("Wake", "Wake timer scheduled successfully", { wakeTime: wakeTime.toISOString() });
    return {
      success: true,
      message: `Wake timer scheduled for ${wakeTime.toLocaleTimeString()}`,
      wakeTime,
    };
  } catch (error) {
    logger.error("Wake", "Error scheduling wake timer", { error: (error as Error).message });
    return {
      success: false,
      message: `Failed to schedule wake timer: ${(error as Error).message}`,
    };
  }
}

export async function controlVlc(
  action: ActionType,
  playlistName?: string,
): Promise<{ success: boolean; message: string }> {
  try {
    logger.info("Controller", "Controlling media", { action, playlistName });

    // For daily actions, we need to find the current event
    if (!playlistName) {
      const currentEvent = await getCurrentEvent();
      logger.debug("Controller", "Current event lookup", { event: currentEvent?.summary });
      if (!currentEvent && action === "play") {
        logger.warn("Controller", "No active event found for play action");
        return {
          success: false,
          message: "No active event found for the current time",
        };
      }
      playlistName = currentEvent?.summary;
    }

    logger.debug("Controller", "Final playlist name", { playlistName });

    // Get settings to determine player mode
    const settings = getSettings();
    const playerMode = settings.playerMode || "vlc";

    logger.info("Controller", "Executing action", {
      action,
      playerMode,
      playlistName,
      windowBehavior: settings.mediaPlayerWindowBehavior
    });

    let result: { success: boolean; message: string };

    switch (action) {
      case "play":
        if (playerMode === "built-in") {
          result = await playPlaylistBuiltIn(playlistName || "");
        } else {
          result = await playPlaylistVLC(playlistName || "");
        }
        break;
      case "pause":
        if (playerMode === "built-in") {
          result = await pauseBuiltIn();
        } else {
          result = await pauseVlc();
        }
        break;
      case "stop":
        if (playerMode === "built-in") {
          result = await stopBuiltIn();
        } else {
          result = await stopVlc({ killProcess: true });
        }
        break;
      case "sleep":
        result = await sleepWindows();
        break;
      case "wake":
        result = await wakeWindows();
        break;
      default:
        logger.warn("Controller", "Unknown action type", { action });
        result = {
          success: false,
          message: `Unknown action: ${action}`,
        };
    }

    // Log the result
    if (result.success) {
      logger.info("Controller", "Action executed successfully", { action, result: result.message });
    } else {
      logger.error("Controller", "Action failed", { action, result: result.message });
    }

    // Broadcast the result for monitoring
    broadcast({
      type: "actionExecuted",
      action,
      playlistName,
      playerMode,
      result,
      timestamp: Date.now(),
    });

    return result;
  } catch (error: Error | any) {
    logger.error("Controller", "Error controlling media", { action, error: error.message });

    const errorResult = {
      success: false,
      message: error.message,
    };

    // Broadcast error for monitoring
    broadcast({
      type: "actionError",
      action,
      playlistName,
      error: error.message,
      timestamp: Date.now(),
    });

    return errorResult;
  }
}

// Export the generatePlaylistFilenames function for use in other modules
export { generatePlaylistFilenames };
