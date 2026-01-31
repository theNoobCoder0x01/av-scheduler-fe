import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type SleepMode = "S0" | "S3" | "unknown";

export interface SleepCapabilities {
  supportedMode: SleepMode;
  supportsRTCWake: boolean;
  canAutoWakeup: boolean;
  detectionTimestamp: number;
  errorMessage?: string;
}

/**
 * Detects the available sleep mode (S0 Modern Standby or S3 traditional sleep)
 * and checks if RTC wake timers are supported.
 *
 * This function executes `powercfg /a` to determine available sleep states.
 *
 * @returns Promise<SleepCapabilities> - Object containing sleep mode capabilities
 */
export async function detectSleepCapabilities(): Promise<SleepCapabilities> {
  const startTime = Date.now();

  try {
    console.log("[Sleep Detector] Starting sleep mode detection...");

    // Check if running on Windows
    if (process.platform !== "win32") {
      return {
        supportedMode: "unknown",
        supportsRTCWake: false,
        canAutoWakeup: false,
        detectionTimestamp: Date.now(),
        errorMessage: "Sleep mode detection is only available on Windows",
      };
    }

    // Execute powercfg /a to list available sleep states
    const { stdout: powercfgOutput } = await execAsync("powercfg /a", {
      timeout: 5000,
    });

    console.log("[Sleep Detector] powercfg /a output:", powercfgOutput);

    // Parse the output to detect sleep mode
    let detectedMode: SleepMode = "unknown";

    // Check for S0 Modern Standby (Low Power Idle)
    if (
      powercfgOutput.includes("Standby (S0 Low Power Idle)") &&
      !powercfgOutput.match(/Standby \(S0 Low Power Idle\).*not supported/i)
    ) {
      detectedMode = "S0";
      console.log("[Sleep Detector] Detected S0 Modern Standby (Low Power Idle)");
    }
    // Check for S3 traditional sleep
    else if (
      powercfgOutput.includes("Standby (S3)") &&
      !powercfgOutput.match(/Standby \(S3\).*not supported/i)
    ) {
      detectedMode = "S3";
      console.log("[Sleep Detector] Detected S3 traditional sleep");
    }

    // Check RTC wake support
    const rtcWakeSupport = await checkRTCWakeSupport();

    // Determine if auto-wakeup is possible
    let canAutoWakeup = false;
    if (detectedMode === "S0") {
      // S0 Modern Standby generally supports wake timers
      canAutoWakeup = rtcWakeSupport;
    } else if (detectedMode === "S3") {
      // S3 requires specific hardware support for RTC wake
      canAutoWakeup = rtcWakeSupport;
    }

    const detectionDuration = Date.now() - startTime;
    console.log(
      `[Sleep Detector] Detection completed in ${detectionDuration}ms - Mode: ${detectedMode}, RTC Wake: ${rtcWakeSupport}, Auto-wakeup: ${canAutoWakeup}`,
    );

    return {
      supportedMode: detectedMode,
      supportsRTCWake: rtcWakeSupport,
      canAutoWakeup,
      detectionTimestamp: Date.now(),
    };
  } catch (error) {
    console.error("[Sleep Detector] Error detecting sleep capabilities:", error);
    return {
      supportedMode: "unknown",
      supportsRTCWake: false,
      canAutoWakeup: false,
      detectionTimestamp: Date.now(),
      errorMessage: `Detection failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Checks if the system supports RTC (Real-Time Clock) wake timers
 * by examining wake timer capabilities and armed devices.
 *
 * @returns Promise<boolean> - True if RTC wake is supported
 */
async function checkRTCWakeSupport(): Promise<boolean> {
  try {
    // Check if there are any devices that can wake the system
    const { stdout: wakeDevices } = await execAsync(
      "powercfg /devicequery wake_armed",
      { timeout: 3000 },
    );

    console.log("[Sleep Detector] Wake-armed devices:", wakeDevices.trim());

    // Check current wake timers (this also validates if wake timers are supported)
    try {
      const { stdout: wakeTimers } = await execAsync("powercfg /waketimers", {
        timeout: 3000,
      });
      console.log("[Sleep Detector] Wake timers output:", wakeTimers.trim());

      // If the command executes without error, RTC wake is supported
      // (even if no timers are currently active)
      return true;
    } catch (error) {
      // If powercfg /waketimers fails, RTC wake might not be supported
      console.log(
        "[Sleep Detector] Wake timers check failed, RTC wake might not be supported",
      );
      return false;
    }
  } catch (error) {
    console.error("[Sleep Detector] Error checking RTC wake support:", error);
    return false;
  }
}

/**
 * Cache for sleep capabilities to avoid repeated detection
 */
let cachedCapabilities: SleepCapabilities | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

/**
 * Gets sleep capabilities with optional caching.
 * Re-detects if cache is expired or forced refresh is requested.
 *
 * @param forceRefresh - If true, bypasses cache and performs fresh detection
 * @returns Promise<SleepCapabilities>
 */
export async function getSleepCapabilities(
  forceRefresh = false,
): Promise<SleepCapabilities> {
  // Return cached result if valid and not forcing refresh
  if (
    !forceRefresh &&
    cachedCapabilities &&
    Date.now() - cachedCapabilities.detectionTimestamp < CACHE_DURATION
  ) {
    console.log("[Sleep Detector] Returning cached capabilities");
    return cachedCapabilities;
  }

  // Detect and cache new capabilities
  console.log("[Sleep Detector] Performing fresh detection");
  cachedCapabilities = await detectSleepCapabilities();
  return cachedCapabilities;
}

/**
 * Clears the cached sleep capabilities, forcing next call to re-detect.
 */
export function clearCapabilitiesCache(): void {
  console.log("[Sleep Detector] Clearing capabilities cache");
  cachedCapabilities = null;
}
