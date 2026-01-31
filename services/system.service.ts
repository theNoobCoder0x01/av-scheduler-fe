import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082/api";

export interface SleepStateDetails {
  available: boolean;
  variant?: string; // e.g., "Network Connected" for S0
  reason?: string; // Why it's not available
}

export interface SleepCapabilities {
  supportedMode: "S0" | "S1" | "S2" | "S3" | "S4" | "unknown";
  supportsRTCWake: boolean;
  canAutoWakeup: boolean;
  detectionTimestamp: number;
  errorMessage?: string;
  isRunningAsAdmin?: boolean;
  // Detailed state information
  states: {
    s0: SleepStateDetails;
    s1: SleepStateDetails;
    s2: SleepStateDetails;
    s3: SleepStateDetails;
    hibernate: SleepStateDetails;
    hybridSleep: SleepStateDetails;
    fastStartup: SleepStateDetails;
  };
  wakeArmedDevices: string[];
  hasActiveWakeTimers: boolean;
  requiresAdminForWakeTimers: boolean;
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
