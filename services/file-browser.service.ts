import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082/api";

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isMediaFile: boolean;
  size: number;
  lastModified: string;
  extension: string;
}

export interface DirectoryContents {
  currentPath: string;
  parentPath: string | null;
  items: FileItem[];
}

export interface SystemDrive {
  name: string;
  path: string;
  type: string;
}

export interface SearchResult {
  query: string;
  searchPath: string;
  results: FileItem[];
}

export class FileBrowserService {
  static async browseDirectory(path?: string): Promise<DirectoryContents> {
    try {
      const params = path ? { path } : {};
      const { data: response } = await axios.get(
        `${API_BASE_URL}/files/browse`,
        { params },
      );
      return response.data;
    } catch (error) {
      throw new Error("Failed to browse directory");
    }
  }

  static async getSystemDrives(): Promise<SystemDrive[]> {
    try {
      const { data: response } = await axios.get(
        `${API_BASE_URL}/files/drives`,
      );
      return response.data;
    } catch (error) {
      throw new Error("Failed to get system drives");
    }
  }

  static async searchFiles(
    searchPath: string,
    query: string,
    mediaOnly = false,
  ): Promise<SearchResult> {
    try {
      const { data: response } = await axios.get(
        `${API_BASE_URL}/files/search`,
        {
          params: { path: searchPath, q: query, mediaOnly },
        },
      );
      return response.data;
    } catch (error) {
      throw new Error("Failed to search files");
    }
  }
}
