import express from "express";
import { broadcast } from "../lib/web-socket";

const playerControlRouter = express.Router();

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentTrack: string | null;
  playlist: string[];
  currentIndex: number;
  repeat: 'none' | 'one' | 'all';
  shuffle: boolean;
}

let playerState: PlayerState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  currentTrack: null,
  playlist: [],
  currentIndex: -1,
  repeat: 'none',
  shuffle: false
};

// Get current player state
playerControlRouter.get("/state", (req, res) => {
  res.json({
    message: "Player state retrieved successfully",
    data: playerState
  });
});

// Update player state
playerControlRouter.post("/state", (req, res) => {
  try {
    const updates = req.body;
    playerState = { ...playerState, ...updates };
    
    // Broadcast state change to all connected clients
    broadcast({
      type: "playerStateUpdate",
      data: playerState
    });

    res.json({
      message: "Player state updated successfully",
      data: playerState
    });
  } catch (error) {
    console.error("Error updating player state:", error);
    res.status(500).json({ error: "Failed to update player state" });
  }
});

// Player control commands
playerControlRouter.post("/command", (req, res) => {
  try {
    const { command, data } = req.body;

    switch (command) {
      case "play":
        playerState.isPlaying = true;
        break;
      case "pause":
        playerState.isPlaying = false;
        break;
      case "stop":
        playerState.isPlaying = false;
        playerState.currentTime = 0;
        break;
      case "seek":
        if (typeof data.time === "number") {
          playerState.currentTime = data.time;
        }
        break;
      case "volume":
        if (typeof data.volume === "number") {
          playerState.volume = Math.max(0, Math.min(1, data.volume));
        }
        break;
      case "next":
        if (playerState.currentIndex < playerState.playlist.length - 1) {
          playerState.currentIndex++;
          playerState.currentTrack = playerState.playlist[playerState.currentIndex];
          playerState.currentTime = 0;
        }
        break;
      case "previous":
        if (playerState.currentIndex > 0) {
          playerState.currentIndex--;
          playerState.currentTrack = playerState.playlist[playerState.currentIndex];
          playerState.currentTime = 0;
        }
        break;
      case "shuffle":
        playerState.shuffle = !playerState.shuffle;
        break;
      case "repeat":
        const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
        const currentIndex = modes.indexOf(playerState.repeat);
        playerState.repeat = modes[(currentIndex + 1) % modes.length];
        break;
      default:
        return res.status(400).json({ error: "Unknown command" });
    }

    // Broadcast command to all connected clients
    broadcast({
      type: "playerCommand",
      command,
      data,
      playerState
    });

    res.json({
      message: "Command executed successfully",
      data: playerState
    });
  } catch (error) {
    console.error("Error executing player command:", error);
    res.status(500).json({ error: "Failed to execute command" });
  }
});

// Load playlist
playerControlRouter.post("/playlist", (req, res) => {
  try {
    const { tracks, startIndex = 0 } = req.body;

    if (!Array.isArray(tracks)) {
      return res.status(400).json({ error: "Tracks must be an array" });
    }

    playerState.playlist = tracks;
    playerState.currentIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
    playerState.currentTrack = tracks[playerState.currentIndex] || null;
    playerState.currentTime = 0;

    broadcast({
      type: "playlistLoaded",
      data: playerState
    });

    res.json({
      message: "Playlist loaded successfully",
      data: playerState
    });
  } catch (error) {
    console.error("Error loading playlist:", error);
    res.status(500).json({ error: "Failed to load playlist" });
  }
});

export default playerControlRouter;