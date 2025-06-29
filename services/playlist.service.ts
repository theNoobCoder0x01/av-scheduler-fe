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

export interface CreatePlaylistRequest {
  name: string;
  tracks: string[];
  savePath: string;
  eventId?: string;
}

export interface CreatePlaylistResponse {
  success: boolean;
  filePath: string;
  message: string;
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

  static async createPlaylist(request: CreatePlaylistRequest): Promise<CreatePlaylistResponse> {
    try {
      const { data: response } = await axios.post(`${API_BASE_URL}/playlists/create`, request);
      return response;
    } catch (error) {
      throw new Error("Failed to create playlist");
    }
  }
}