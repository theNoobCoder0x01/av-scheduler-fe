import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type SleepMode = "S0" | "S1" | "S2" | "S3" | "S4" | "unknown";

export interface SleepStateDetails {
  available: boolean;
  variant?: string; // e.g., "Network Connected" for S0
  reason?: string; // Why it's not available
}

export interface SleepCapabilities {
  supportedMode: SleepMode;
  supportsRTCWake: boolean;
  canAutoWakeup: boolean;
  detectionTimestamp: number;
  errorMessage?: string;
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

/**
 * Parses powercfg /a output to extract detailed sleep state information
 */
function parsePowercfgOutput(output: string): {
  availableStates: string[];
  unavailableStates: Map<string, string[]>;
} {
  const lines = output.split("\n").map((line) => line.trim());
  const availableStates: string[] = [];
  const unavailableStates = new Map<string, string[]>();

  let isAvailableSection = false;
  let isUnavailableSection = false;
  let currentState: string | null = null;

  for (const line of lines) {
    if (line.includes("following sleep states are available")) {
      isAvailableSection = true;
      isUnavailableSection = false;
      currentState = null;
      continue;
    }

    if (line.includes("following sleep states are not available")) {
      isAvailableSection = false;
      isUnavailableSection = true;
      currentState = null;
      continue;
    }

    if (isAvailableSection && line.length > 0) {
      availableStates.push(line);
    }

    if (isUnavailableSection && line.length > 0) {
      // Check if this is a state name (starts with capital or number)
      if (
        line.match(/^[A-Z0-9]/) &&
        !line.includes("system firmware") &&
        !line.includes("is disabled") &&
        !line.includes("not available")
      ) {
        currentState = line;
        unavailableStates.set(currentState, []);
      } else if (currentState && line.length > 0) {
        // This is a reason line
        unavailableStates.get(currentState)!.push(line);
      }
    }
  }

  return { availableStates, unavailableStates };
}

/**
 * Extracts sleep state details from parsed powercfg output
 */
function extractSleepStateDetails(
  availableStates: string[],
  unavailableStates: Map<string, string[]>,
): SleepCapabilities["states"] {
  const states: SleepCapabilities["states"] = {
    s0: { available: false },
    s1: { available: false },
    s2: { available: false },
    s3: { available: false },
    hibernate: { available: false },
    hybridSleep: { available: false },
    fastStartup: { available: false },
  };

  // Check available states
  for (const state of availableStates) {
    const stateLower = state.toLowerCase();

    if (stateLower.includes("standby (s0")) {
      states.s0.available = true;
      // Extract variant (e.g., "Network Connected")
      const variantMatch = state.match(/Standby \(S0[^)]*\)\s+(.+)/i);
      if (variantMatch) {
        states.s0.variant = variantMatch[1].trim();
      }
    } else if (stateLower.includes("standby (s1")) {
      states.s1.available = true;
    } else if (stateLower.includes("standby (s2")) {
      states.s2.available = true;
    } else if (stateLower.includes("standby (s3")) {
      states.s3.available = true;
    } else if (stateLower.includes("hibernate")) {
      states.hibernate.available = true;
    } else if (stateLower.includes("hybrid sleep")) {
      states.hybridSleep.available = true;
    } else if (stateLower.includes("fast startup")) {
      states.fastStartup.available = true;
    }
  }

  // Check unavailable states and extract reasons
  unavailableStates.forEach((reasons, state) => {
    const stateLower = state.toLowerCase();
    const reasonText = reasons.join(" ").trim();

    if (stateLower.includes("standby (s1")) {
      states.s1.available = false;
      states.s1.reason = reasonText || "Not supported";
    } else if (stateLower.includes("standby (s2")) {
      states.s2.available = false;
      states.s2.reason = reasonText || "Not supported";
    } else if (stateLower.includes("standby (s3")) {
      states.s3.available = false;
      states.s3.reason = reasonText || "Not supported";
    } else if (stateLower.includes("hybrid sleep")) {
      states.hybridSleep.available = false;
      states.hybridSleep.reason = reasonText || "Not supported";
    }
  });

  return states;
}

/**
 * Detects the available sleep mode and checks if RTC wake timers are supported.
 *
 * This function executes `powercfg /a` to determine available sleep states and provides
 * comprehensive details about system sleep capabilities.
 *
 * @returns Promise<SleepCapabilities> - Object containing sleep mode capabilities
 */
export async function detectSleepCapabilities(): Promise<SleepCapabilities> {
  const startTime = Date.now();

  const defaultStates: SleepCapabilities["states"] = {
    s0: { available: false },
    s1: { available: false },
    s2: { available: false },
    s3: { available: false },
    hibernate: { available: false },
    hybridSleep: { available: false },
    fastStartup: { available: false },
  };

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
        states: defaultStates,
        wakeArmedDevices: [],
        hasActiveWakeTimers: false,
        requiresAdminForWakeTimers: false,
      };
    }

    // Execute powercfg /a to list available sleep states
    const { stdout: powercfgOutput } = await execAsync("powercfg /a", {
      timeout: 5000,
    });

    console.log("[Sleep Detector] powercfg /a output:\n", powercfgOutput);

    // Parse the output
    const { availableStates, unavailableStates } =
      parsePowercfgOutput(powercfgOutput);
    const states = extractSleepStateDetails(availableStates, unavailableStates);

    // Determine primary supported mode (priority: S0 > S3 > S1 > S2 > S4)
    let detectedMode: SleepMode = "unknown";
    if (states.s0.available) {
      detectedMode = "S0";
      console.log(
        `[Sleep Detector] Primary mode: S0 Modern Standby${states.s0.variant ? ` (${states.s0.variant})` : ""}`,
      );
    } else if (states.s3.available) {
      detectedMode = "S3";
      console.log("[Sleep Detector] Primary mode: S3 Traditional Sleep");
    } else if (states.s1.available) {
      detectedMode = "S1";
      console.log("[Sleep Detector] Primary mode: S1 Sleep");
    } else if (states.s2.available) {
      detectedMode = "S2";
      console.log("[Sleep Detector] Primary mode: S2 Sleep");
    } else if (states.hibernate.available) {
      detectedMode = "S4";
      console.log("[Sleep Detector] Primary mode: S4 Hibernate");
    }

    // Log all states for debugging
    console.log("[Sleep Detector] Available states:", {
      S0: states.s0.available ? `Yes${states.s0.variant ? ` (${states.s0.variant})` : ""}` : "No",
      S1: states.s1.available ? "Yes" : `No${states.s1.reason ? ` - ${states.s1.reason}` : ""}`,
      S2: states.s2.available ? "Yes" : `No${states.s2.reason ? ` - ${states.s2.reason}` : ""}`,
      S3: states.s3.available ? "Yes" : `No${states.s3.reason ? ` - ${states.s3.reason}` : ""}`,
      Hibernate: states.hibernate.available ? "Yes" : "No",
      HybridSleep: states.hybridSleep.available ? "Yes" : `No${states.hybridSleep.reason ? ` - ${states.hybridSleep.reason}` : ""}`,
      FastStartup: states.fastStartup.available ? "Yes" : "No",
    });

    // Check RTC wake support and wake-armed devices
    const {
      supportsRTC,
      wakeArmedDevices,
      hasActiveWakeTimers,
      requiresAdmin,
    } = await checkRTCWakeSupport();

    // Determine if auto-wakeup is possible
    let canAutoWakeup = false;
    if (detectedMode === "S0" || detectedMode === "S3") {
      // Modern Standby (S0) and traditional sleep (S3) generally support wake timers if RTC is available
      canAutoWakeup = supportsRTC;
    } else if (detectedMode === "S1" || detectedMode === "S2") {
      // S1/S2 may support wake timers depending on hardware
      canAutoWakeup = supportsRTC;
    } else if (detectedMode === "S4") {
      // Hibernate (S4) can support wake timers on some systems
      canAutoWakeup = supportsRTC;
    }

    const detectionDuration = Date.now() - startTime;
    console.log(
      `[Sleep Detector] Detection completed in ${detectionDuration}ms - Mode: ${detectedMode}, RTC Wake: ${supportsRTC}, Auto-wakeup: ${canAutoWakeup}`,
    );

    return {
      supportedMode: detectedMode,
      supportsRTCWake: supportsRTC,
      canAutoWakeup,
      detectionTimestamp: Date.now(),
      states,
      wakeArmedDevices,
      hasActiveWakeTimers,
      requiresAdminForWakeTimers: requiresAdmin,
    };
  } catch (error) {
    console.error("[Sleep Detector] Error detecting sleep capabilities:", error);
    return {
      supportedMode: "unknown",
      supportsRTCWake: false,
      canAutoWakeup: false,
      detectionTimestamp: Date.now(),
      errorMessage: `Detection failed: ${(error as Error).message}`,
      states: defaultStates,
      wakeArmedDevices: [],
      hasActiveWakeTimers: false,
      requiresAdminForWakeTimers: false,
    };
  }
}

/**
 * Checks if the system supports RTC (Real-Time Clock) wake timers
 * by examining wake timer capabilities and armed devices.
 *
 * @returns Promise with RTC support details
 */
async function checkRTCWakeSupport(): Promise<{
  supportsRTC: boolean;
  wakeArmedDevices: string[];
  hasActiveWakeTimers: boolean;
  requiresAdmin: boolean;
}> {
  const result = {
    supportsRTC: false,
    wakeArmedDevices: [] as string[],
    hasActiveWakeTimers: false,
    requiresAdmin: false,
  };

  try {
    // Check if there are any devices that can wake the system
    try {
      const { stdout: wakeDevices } = await execAsync(
        "powercfg /devicequery wake_armed",
        { timeout: 3000 },
      );

      console.log("[Sleep Detector] Wake-armed devices:", wakeDevices.trim());

      // Parse wake-armed devices (one per line, excluding "NONE")
      const devices = wakeDevices
        .trim()
        .split("\n")
        .map((d) => d.trim())
        .filter((d) => d.length > 0 && d.toUpperCase() !== "NONE");

      result.wakeArmedDevices = devices;

      if (devices.length > 0) {
        console.log(
          `[Sleep Detector] Found ${devices.length} wake-armed device(s)`,
        );
      } else {
        console.log("[Sleep Detector] No wake-armed devices found");
      }
    } catch (error) {
      console.warn(
        "[Sleep Detector] Failed to query wake-armed devices:",
        error,
      );
    }

    // Check current wake timers (this also validates if wake timers are supported)
    try {
      const { stdout: wakeTimers, stderr: wakeTimersErr } = await execAsync(
        "powercfg /waketimers",
        { timeout: 3000 },
      );

      // Check if command requires admin
      if (
        wakeTimersErr &&
        (wakeTimersErr.toLowerCase().includes("access is denied") ||
          wakeTimersErr.toLowerCase().includes("requires elevation") ||
          wakeTimersErr.toLowerCase().includes("administrator"))
      ) {
        console.log(
          "[Sleep Detector] Wake timers command requires administrator privileges",
        );
        result.requiresAdmin = true;
        // Even if admin is required, the system likely supports RTC wake
        result.supportsRTC = true;
      } else {
        console.log("[Sleep Detector] Wake timers output:", wakeTimers.trim());

        // Check if there are active wake timers
        const hasTimers =
          wakeTimers.trim().length > 0 &&
          !wakeTimers.toLowerCase().includes("no active wake timers");

        result.hasActiveWakeTimers = hasTimers;
        result.supportsRTC = true; // Command succeeded, RTC wake is supported

        if (hasTimers) {
          console.log("[Sleep Detector] Active wake timers detected");
        } else {
          console.log("[Sleep Detector] No active wake timers");
        }
      }
    } catch (error: any) {
      // Check if it's a permission error
      const errorMsg = error.message?.toLowerCase() || "";
      if (
        errorMsg.includes("access is denied") ||
        errorMsg.includes("requires elevation") ||
        errorMsg.includes("administrator")
      ) {
        console.log(
          "[Sleep Detector] Wake timers require administrator privileges",
        );
        result.requiresAdmin = true;
        // System likely supports RTC wake, just needs admin to check
        result.supportsRTC = true;
      } else {
        // If powercfg /waketimers fails for other reasons, RTC wake might not be supported
        console.log(
          "[Sleep Detector] Wake timers check failed, RTC wake might not be supported:",
          error.message,
        );
        result.supportsRTC = false;
      }
    }
  } catch (error) {
    console.error("[Sleep Detector] Error checking RTC wake support:", error);
  }

  return result;
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
