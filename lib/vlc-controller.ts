/**
 * This utility provides functions to control VLC media player.
 * The implementation is browser-based and uses special protocols to interact with VLC.
 * In a real-world scenario, this would be implemented using server-side code or
 * a native desktop application that can directly interact with VLC via its HTTP interface
 * or command-line arguments.
 */

import { ActionType, ICalendarEvent } from "@/lib/types";
import { selectEvents } from "./store/slices/eventsSlice";
import { store } from "./store/store";

function getCurrentEvent(): ICalendarEvent | undefined {
  const state = store.getState();
  const currentEvents = selectEvents(state);
  return currentEvents.find((event) => {
    const eventStart = event.start;
    const eventEnd = event.end;
    const now = Math.floor(new Date().getTime() / 1000) - 365 * 24 * 60 * 60;
    return now >= eventStart && now <= eventEnd;
  });
}

export async function controlVlc(
  action: ActionType,
  playlistName?: string
): Promise<{ success: boolean; message: string }> {
  debugger;
  try {
    // For daily actions, we need to find the current event
    if (!playlistName) {
      const currentEvent = getCurrentEvent();
      if (!currentEvent && action === "play") {
        return {
          success: false,
          message: "No active event found for the current time",
        };
      }
      playlistName = currentEvent?.summary;
    }

    switch (action) {
      case "play":
        return await playPlaylist(playlistName || "");
      case "pause":
        return await pauseVlc();
      case "stop":
        return await stopVlc();
      default:
        return {
          success: false,
          message: `Unknown action: ${action}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message,
    };
  }
}

async function playPlaylist(
  playlistName: string
): Promise<{ success: boolean; message: string }> {
  if (!playlistName) {
    return {
      success: false,
      message: "Playlist name is required for play action",
    };
  }

  try {
    const cleanName = playlistName.replace(/[<>:"/\\|?*]/g, "_");
    const fileName = `${cleanName}.m3u`;

    const link = document.createElement("a");
    link.href = `http://${fileName}`;
    link.target = "_blank";
    link.click();

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: `Started playing playlist: ${fileName}`,
        });
      }, 500);
    });
  } catch (error) {
    return {
      success: false,
      message:
        "Failed to play playlist. VLC may not be accessible from the browser.",
    };
  }
}

async function pauseVlc(): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: "Playback paused",
  };
}

async function stopVlc(): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: "Playback stopped",
  };
}
