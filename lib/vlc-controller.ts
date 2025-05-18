import { ActionType, ICalendarEvent } from "@/lib/types";
import { ChildProcess, exec, spawn } from "child_process";
import path from "path";
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
  const response = await fetch(`${API_BASE_URL}/calendar-events`);
  const status = response.status;
  if (status !== 200) {
    throw new Error("Failed to fetch calendar events");
  }
  const { data } = await response.json();

  if (!data || data.length === 0) {
    return undefined;
  }

  return (data as ICalendarEvent[]).find((event) => {
    const eventStart = typeof event.start === "number" ? event.start : 0;
    const eventEnd = typeof event.end === "number" ? event.end : 0;
    const now = Math.floor(new Date().getTime() / 1000) - 365 * 24 * 60 * 60;
    return now >= eventStart && now <= eventEnd;
  });
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
  command: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Sending HTTP command to VLC: " + command);
    const auth = Buffer.from(`:${VLC_HTTP_PASSWORD}`).toString("base64");
    const response = await fetch(
      `http://${VLC_HTTP_HOST}:${VLC_HTTP_PORT}/requests/status.json?command=${command}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return {
      success: true,
      message: `Command ${command} executed successfully`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to execute command: ${error}`,
    };
  }
}

async function playPlaylist(
  playlistName: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Playing playlist: " + playlistName);

    if (!playlistName) {
      return {
        success: false,
        message: "Playlist name is required for play action",
      };
    }

    const cleanName = playlistName.replace(/[<>:"/\\|?*]/g, "_");
    const fileName = `${cleanName}.m3u`;
    const filePath = path.join(process.cwd(), "playlists", fileName);

    if (USE_HTTP_INTERFACE) {
      console.log("Using HTTP interface to control VLC");

      // Start VLC with HTTP interface if not running
      const vlcRunning = await isVlcRunning();
      console.log("VLC running: " + vlcRunning);

      if (!vlcRunning) {
        logger.help("Starting VLC with HTTP interface");
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
          logger.help(`VLC stdout: ${data}`);
        });

        vlcProcess?.stderr?.on?.("data", (data) => {
          logger.help(`VLC stderr: ${data}`);
        });

        vlcProcess?.on("close", (code) => {
          logger.help(`VLC process exited with code ${code}`);
        });
      } else {
        console.log("VLC is already running, sending HTTP command");
        // If VLC is running, use HTTP command to load playlist
        return await sendHttpCommand(
          `in_play&input=${encodeURIComponent(filePath)}`
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

    currentPlaylist = fileName;
    return {
      success: true,
      message: `Started playing playlist: ${currentPlaylist}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to play playlist: ${(error as Error).message}`,
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

async function stopVlc(
  { killProcess = false }: { killProcess: boolean } = { killProcess: false }
): Promise<{ success: boolean; message: string }> {
  try {
    logger.help("Stopping VLC playback");
    logger.help("Is Http interface: ", USE_HTTP_INTERFACE);
    logger.help("Kill process: ", killProcess);
    logger.help("VLC process: ", vlcProcess);
    logger.help("Will try to quit app: ", killProcess || !USE_HTTP_INTERFACE);

    let httpRes;
    if (USE_HTTP_INTERFACE) {
      httpRes = await sendHttpCommand("pl_stop");
    }
    if (killProcess || !USE_HTTP_INTERFACE) {
      if (vlcProcess) {
        vlcProcess.kill();
        vlcProcess = null;
        currentPlaylist = null;
      } else {
        if (process.platform === "win32") {
          exec("taskkill /IM vlc.exe /F");
        } else {
          exec("pkill -f VLC");
        }
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
  playlistName?: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Playlist name: " + `${!playlistName}`);

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

    console.log("Controlling VLC with action: " + action);

    switch (action) {
      case "play":
        return await playPlaylist(playlistName || "");
      case "pause":
        return await pauseVlc();
      case "stop":
        return await stopVlc({ killProcess: true });
      default:
        return {
          success: false,
          message: `Unknown action: ${action}`,
        };
    }
  } catch (error: Error | any) {
    console.error("Error controlling VLC:" + error);

    return {
      success: false,
      message: error.message,
    };
  }
}
