import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082/api";

export interface SleepCapabilities {
  supportedMode: "S0" | "S3" | "unknown";
  supportsRTCWake: boolean;
  canAutoWakeup: boolean;
  detectionTimestamp: number;
  errorMessage?: string;
  isRunningAsAdmin?: boolean;
}

export class SystemService {
  /**
   * Fetches the system's sleep mode capabilities
   */
  static async getSleepCapabilities(): Promise<SleepCapabilities> {
    try {
      const response = await axios.get(`${API_BASE_URL}/system/sleep-capabilities`);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching sleep capabilities:", error);
      throw error;
    }
  }

  /**
   * Forces a refresh of sleep capability detection
   */
  static async refreshSleepCapabilities(): Promise<SleepCapabilities> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/system/refresh-sleep-capabilities`,
      );
      return response.data.data;
    } catch (error) {
      console.error("Error refreshing sleep capabilities:", error);
      throw error;
    }
  }
}
