import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082/api";

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentTrack: string | null;
  playlist: string[];
  currentIndex: number;
  repeat: "none" | "one" | "all";
  shuffle: boolean;
}

export class PlayerService {
  static async getState(): Promise<PlayerState> {
    try {
      const { data: response } = await axios.get(
        `${API_BASE_URL}/player/state`,
      );
      return response.data;
    } catch (error) {
      throw new Error("Failed to get player state");
    }
  }

  static async updateState(
    updates: Partial<PlayerState>,
  ): Promise<PlayerState> {
    try {
      const { data: response } = await axios.post(
        `${API_BASE_URL}/player/state`,
        updates,
      );
      return response.data;
    } catch (error) {
      throw new Error("Failed to update player state");
    }
  }

  static async sendCommand(command: string, data?: any): Promise<PlayerState> {
    try {
      const { data: response } = await axios.post(
        `${API_BASE_URL}/player/command`,
        { command, data },
      );
      return response.data;
    } catch (error) {
      throw new Error("Failed to send player command");
    }
  }

  static async loadPlaylist(
    tracks: string[],
    startIndex = 0,
  ): Promise<PlayerState> {
    try {
      const { data: response } = await axios.post(
        `${API_BASE_URL}/player/playlist`,
        { tracks, startIndex },
      );
      return response.data;
    } catch (error) {
      throw new Error("Failed to load playlist");
    }
  }
}
