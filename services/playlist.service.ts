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

export interface PlaylistContent {
  tracks: string[];
  metadata: {
    name: string;
    path: string;
    trackCount: number;
  };
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

  static async loadPlaylistContent(playlistPath: string): Promise<PlaylistContent> {
    try {
      const { data: response } = await axios.get(
        `${API_BASE_URL}/playlists/content/${encodeURIComponent(playlistPath)}`
      );
      return response.data;
    } catch (error) {
      throw new Error("Failed to load playlist content");
    }
  }

  static isPlaylistFile(filePath: string): boolean {
    const ext = filePath.split('.').pop()?.toLowerCase();
    return ext === 'm3u' || ext === 'm3u8' || ext === 'pls';
  }

  static getPlaylistType(filePath: string): 'M3U' | 'M3U8' | 'PLS' | 'Unknown' {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'm3u': return 'M3U';
      case 'm3u8': return 'M3U8';
      case 'pls': return 'PLS';
      default: return 'Unknown';
    }
  }
}