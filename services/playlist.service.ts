import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082/api";

export interface PlaylistInfo {
  name: string;
  nameWithoutExtension: string;
  path: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
}

export interface PlaylistCheckResult {
  found: boolean;
  data: PlaylistInfo[];
  searchedFor: string;
  possibleFilenames: string[];
}

export class PlaylistService {
  static async getAllPlaylists(): Promise<{
    playlists: PlaylistInfo[];
    folderPath: string;
    count: number;
  }> {
    try {
      const { data: response } = await axios.get(`${API_BASE_URL}/playlists`);
      return {
        playlists: response.data,
        folderPath: response.folderPath,
        count: response.count,
      };
    } catch (error) {
      throw new Error("Failed to fetch playlists");
    }
  }

  static async checkPlaylistExists(playlistName: string): Promise<PlaylistCheckResult> {
    try {
      const { data: response } = await axios.get(
        `${API_BASE_URL}/playlists/check/${encodeURIComponent(playlistName)}`
      );
      return {
        found: response.found,
        data: response.data,
        searchedFor: response.searchedFor,
        possibleFilenames: response.possibleFilenames,
      };
    } catch (error) {
      throw new Error("Failed to check playlist existence");
    }
  }
}