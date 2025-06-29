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
    // Encode the path properly to handle special characters
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

  static async testStreamUrl(filePath: string): Promise<boolean> {
    try {
      const streamUrl = this.getStreamUrl(filePath);
      console.log("🧪 Testing stream URL:", streamUrl);
      
      const response = await fetch(streamUrl, { 
        method: 'HEAD',
        headers: {
          'Range': 'bytes=0-1024'
        }
      });
      
      console.log("🧪 Stream test result:", response.status, response.statusText);
      return response.ok || response.status === 206; // Accept both 200 and 206
    } catch (error) {
      console.error("❌ Stream test failed:", error);
      return false;
    }
  }

  static async validateMediaFile(filePath: string): Promise<boolean> {
    try {
      // Enhanced media format detection
      const ext = filePath.split('.').pop()?.toLowerCase() || '';
      
      // Comprehensive list of supported media formats
      const supportedFormats = [
        // Video formats
        'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'wmv', 'flv', '3gp', 'm4v',
        'mpg', 'mpeg', 'ogv', 'ts', 'mts', 'm2ts', 'vob', 'rm', 'rmvb', 'asf',
        'divx', 'xvid', 'f4v', 'm2v', 'mxf', 'roq', 'nsv',
        
        // Audio formats
        'mp3', 'wav', 'flac', 'aac', 'm4a', 'wma', 'opus', 'amr', 'ac3', 'dts',
        'ape', 'au', 'ra', 'tta', 'tak', 'mpc', 'wv', 'spx', 'gsm', 'aiff',
        'caf', 'w64', 'rf64', 'voc', 'ircam', 'w64', 'mat4', 'mat5', 'pvf',
        'xi', 'htk', 'sds', 'avr', 'wavex', 'sd2', 'flac', 'caf', 'fap',
        
        // Streaming formats
        'm3u8', 'ts', 'webm', 'ogv'
      ];
      
      const isSupported = supportedFormats.includes(ext);
      
      if (!isSupported) {
        console.log(`❌ Unsupported format: ${ext}`);
        return false;
      }
      
      // Try to get metadata as additional validation
      try {
        const metadata = await this.getMetadata(filePath);
        return metadata.isAudio || metadata.isVideo;
      } catch (error) {
        // If metadata fails, still allow if extension is supported
        console.warn("⚠️ Metadata validation failed, but extension is supported:", ext);
        return true;
      }
    } catch (error) {
      console.error("❌ Media validation failed:", error);
      return false;
    }
  }

  static getMediaType(filePath: string): 'audio' | 'video' | 'unknown' {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    
    const videoExtensions = [
      'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'wmv', 'flv', '3gp', 'm4v',
      'mpg', 'mpeg', 'ogv', 'ts', 'mts', 'm2ts', 'vob', 'rm', 'rmvb', 'asf',
      'divx', 'xvid', 'f4v', 'm2v', 'mxf', 'roq', 'nsv'
    ];
    
    const audioExtensions = [
      'mp3', 'wav', 'flac', 'aac', 'm4a', 'wma', 'opus', 'amr', 'ac3', 'dts',
      'ape', 'au', 'ra', 'tta', 'tak', 'mpc', 'wv', 'spx', 'gsm', 'aiff',
      'caf', 'w64', 'rf64', 'voc', 'ircam', 'w64', 'mat4', 'mat5', 'pvf',
      'xi', 'htk', 'sds', 'avr', 'wavex', 'sd2', 'flac', 'caf', 'fap'
    ];
    
    if (videoExtensions.includes(ext)) return 'video';
    if (audioExtensions.includes(ext)) return 'audio';
    return 'unknown';
  }
}