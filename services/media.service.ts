import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082/api";

export interface MediaMetadata {
  name: string;
  path: string;
  size: number;
  extension: string;
  lastModified: string;
  duration: number | null;
  isAudio: boolean;
  isVideo: boolean;
}

export class MediaService {
  static getStreamUrl(filePath: string): string {
    const encodedPath = encodeURIComponent(filePath);
    return `${API_BASE_URL}/media/stream/${encodedPath}`;
  }

  static async getMetadata(filePath: string): Promise<MediaMetadata> {
    try {
      const encodedPath = encodeURIComponent(filePath);
      const { data: response } = await axios.get(`${API_BASE_URL}/media/metadata/${encodedPath}`);
      return response.data;
    } catch (error) {
      throw new Error("Failed to get media metadata");
    }
  }
}