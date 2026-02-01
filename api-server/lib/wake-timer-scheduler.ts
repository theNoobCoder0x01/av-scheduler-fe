import { exec } from "child_process";
import { promisify } from "util";
import { format } from "date-fns";

const execAsync = promisify(exec);

const WAKE_TASK_NAME = "AVSchedulerAutoWake";

export interface WakeTimerResult {
  success: boolean;
  message: string;
  requiresElevation?: boolean;
  wakeTime?: Date;
}

/**
 * Schedules a Windows wake timer using Task Scheduler.
 * This creates a scheduled task that will wake the computer from sleep.
 *
 * @param wakeTime - The date/time when the computer should wake up
 * @returns Promise<WakeTimerResult> - Result of the wake timer scheduling
 */
export async function scheduleWakeTimer(
  wakeTime: Date,
): Promise<WakeTimerResult> {
  try {
    console.log("[Wake Timer] Scheduling wake timer for:", wakeTime);

    // Check if running on Windows
    if (process.platform !== "win32") {
      return {
        success: false,
        message: "Wake timers are only supported on Windows",
      };
    }

    // Validate that wake time is in the future
    const now = new Date();
    if (wakeTime <= now) {
      return {
        success: false,
        message: "Wake time must be in the future",
      };
    }

    // Format the time for Task Scheduler (HH:MM format)
    const wakeTimeStr = format(wakeTime, "HH:mm");
    const wakeDateStr = format(wakeTime, "MM/dd/yyyy");

    console.log(
      `[Wake Timer] Formatted wake time: ${wakeDateStr} ${wakeTimeStr}`,
    );

    // First, delete any existing wake task to avoid conflicts
    try {
      await deleteWakeTimer();
    } catch (error) {
      // Ignore errors if task doesn't exist
      console.log("[Wake Timer] No existing task to delete (this is okay)");
    }

    // Create a new scheduled task with wake capability
    // Using a simple cmd.exe task - the important part is the wake flag (/RL HIGHEST with wake trigger)
    const createTaskCommand = `schtasks /create /tn "${WAKE_TASK_NAME}" /tr "cmd.exe /c exit" /sc once /st ${wakeTimeStr} /sd ${wakeDateStr} /rl HIGHEST /f`;

    try {
      const { stdout, stderr } = await execAsync(createTaskCommand, {
        timeout: 10000,
      });

      console.log("[Wake Timer] Task creation output:", stdout);
      if (stderr) {
        console.log("[Wake Timer] Task creation stderr:", stderr);
      }

      // Check if the command failed due to permissions
      if (
        stderr &&
        (stderr.includes("Access is denied") ||
          stderr.includes("requires elevation"))
      ) {
        return {
          success: false,
          message:
            "Administrator privileges required to schedule wake timer. Please run the application as Administrator.",
          requiresElevation: true,
        };
      }

      // Now enable the wake capability for this task using XML configuration
      // We need to export the task, modify it to add wake capability, then import it back
      const enableWakeResult = await enableTaskWakeCapability(WAKE_TASK_NAME);

      if (!enableWakeResult.success) {
        // Task was created but wake capability couldn't be enabled
        console.warn(
          "[Wake Timer] Task created but wake capability not enabled:",
          enableWakeResult.message,
        );
        return {
          success: true,
          message: `Wake timer scheduled for ${wakeTimeStr}, but wake capability may not be enabled. ${enableWakeResult.message}`,
          wakeTime,
        };
      }

      console.log(
        `[Wake Timer] Successfully scheduled wake timer for ${wakeDateStr} ${wakeTimeStr}`,
      );

      return {
        success: true,
        message: `Wake timer scheduled successfully for ${wakeTimeStr}`,
        wakeTime,
      };
    } catch (error) {
      const errorMsg = (error as Error).message;

      // Check for elevation errors
      if (
        errorMsg.includes("Access is denied") ||
        errorMsg.includes("requires elevation")
      ) {
        return {
          success: false,
          message:
            "Administrator privileges required to schedule wake timer. Please run the application as Administrator.",
          requiresElevation: true,
        };
      }

      throw error;
    }
  } catch (error) {
    console.error("[Wake Timer] Error scheduling wake timer:", error);
    return {
      success: false,
      message: `Failed to schedule wake timer: ${(error as Error).message}`,
    };
  }
}

/**
 * Enables wake capability for a scheduled task by modifying its XML configuration.
 * This is required to actually wake the computer from sleep.
 *
 * @param taskName - Name of the scheduled task
 * @returns Promise<WakeTimerResult>
 */
async function enableTaskWakeCapability(
  taskName: string,
): Promise<WakeTimerResult> {
  try {
    // Export the task to XML
    const exportCommand = `schtasks /query /tn "${taskName}" /xml`;
    const { stdout: taskXml } = await execAsync(exportCommand, {
      timeout: 5000,
    });

    // Modify the XML to enable wake capability
    // We need to add <WakeToRun>true</WakeToRun> to the Settings section
    let modifiedXml = taskXml;

    // Check if WakeToRun already exists
    if (modifiedXml.includes("<WakeToRun>")) {
      // Replace existing value
      modifiedXml = modifiedXml.replace(
        /<WakeToRun>.*?<\/WakeToRun>/,
        "<WakeToRun>true</WakeToRun>",
      );
    } else {
      // Add WakeToRun to Settings section
      modifiedXml = modifiedXml.replace(
        /<\/Settings>/,
        "  <WakeToRun>true</WakeToRun>\n  </Settings>",
      );
    }

    // Save modified XML to a temp file and import it
    const tempXmlPath = `${process.env.TEMP || "C:\\Windows\\Temp"}\\${taskName}_wake.xml`;

    // Write XML to temp file using PowerShell (safer than echo for special characters)
    const writeXmlCommand = `powershell -Command "$xml = @'\n${modifiedXml}\n'@; $xml | Out-File -FilePath '${tempXmlPath}' -Encoding UTF8"`;

    await execAsync(writeXmlCommand, { timeout: 5000 });

    // Import the modified task (this replaces the existing task)
    const importCommand = `schtasks /create /tn "${taskName}" /xml "${tempXmlPath}" /f`;
    await execAsync(importCommand, { timeout: 5000 });

    // Clean up temp file
    try {
      await execAsync(`del "${tempXmlPath}"`, { timeout: 3000 });
    } catch (error) {
      console.log("[Wake Timer] Could not delete temp XML file (non-critical)");
    }

    console.log("[Wake Timer] Wake capability enabled successfully");

    return {
      success: true,
      message: "Wake capability enabled",
    };
  } catch (error) {
    console.error("[Wake Timer] Error enabling wake capability:", error);
    return {
      success: false,
      message: `Could not enable wake capability: ${(error as Error).message}`,
    };
  }
}

/**
 * Deletes the wake timer scheduled task if it exists.
 *
 * @returns Promise<WakeTimerResult>
 */
export async function deleteWakeTimer(): Promise<WakeTimerResult> {
  try {
    console.log("[Wake Timer] Deleting existing wake timer task");

    const deleteCommand = `schtasks /delete /tn "${WAKE_TASK_NAME}" /f`;
    const { stdout } = await execAsync(deleteCommand, { timeout: 5000 });

    console.log("[Wake Timer] Task deletion output:", stdout);

    return {
      success: true,
      message: "Wake timer deleted successfully",
    };
  } catch (error) {
    // Task might not exist, which is fine
    console.log("[Wake Timer] Could not delete task (may not exist):", error);
    return {
      success: true,
      message: "No wake timer to delete",
    };
  }
}

/**
 * Checks if a wake timer is currently scheduled.
 *
 * @returns Promise<boolean> - True if a wake timer exists
 */
export async function hasActiveWakeTimer(): Promise<boolean> {
  try {
    const queryCommand = `schtasks /query /tn "${WAKE_TASK_NAME}"`;
    await execAsync(queryCommand, { timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Checks if the current process has administrator privileges.
 * This is needed for creating wake-capable scheduled tasks.
 *
 * @returns Promise<boolean> - True if running as administrator
 */
export async function isRunningAsAdmin(): Promise<boolean> {
  try {
    if (process.platform !== "win32") {
      return false;
    }

    // Try to access a registry key that requires admin privileges
    const testCommand = 'net session >nul 2>&1 && echo "admin" || echo "not-admin"';
    const { stdout } = await execAsync(testCommand, { timeout: 3000 });

    return stdout.trim().includes("admin");
  } catch (error) {
    return false;
  }
}

/**
 * Refreshes the wake timer based on all scheduled wake actions.
 * This should be called whenever wake actions are created, updated, or deleted.
 * It finds the next wake action and schedules a Windows Task Scheduler task for it.
 *
 * @param wakeActions - Array of all wake actions (should be active only)
 * @returns Promise<WakeTimerResult>
 */
export async function refreshWakeTimer(
  wakeActions: Array<{ id?: string; nextRun?: number; time: string; isDaily?: boolean; date?: string }>
): Promise<WakeTimerResult> {
  try {
    console.log(`[Wake Timer] Refreshing wake timer with ${wakeActions.length} wake action(s)`);

    // Check if running on Windows
    if (process.platform !== "win32") {
      console.log("[Wake Timer] Not on Windows, skipping wake timer refresh");
      return {
        success: true,
        message: "Wake timers are only supported on Windows",
      };
    }

    // If no wake actions, delete any existing wake timer
    if (wakeActions.length === 0) {
      console.log("[Wake Timer] No wake actions found, deleting any existing wake timer");
      return await deleteWakeTimer();
    }

    // Check admin privileges
    const isAdmin = await isRunningAsAdmin();
    if (!isAdmin) {
      console.warn("[Wake Timer] Not running as administrator, cannot manage wake timers");
      return {
        success: false,
        message: "Administrator privileges required to schedule wake timer",
        requiresElevation: true,
      };
    }

    // Find the next wake action after now
    const now = Date.now() / 1000;
    const futureWakeActions = wakeActions
      .filter((action) => action.nextRun && action.nextRun > now)
      .sort((a, b) => (a.nextRun || 0) - (b.nextRun || 0));

    if (futureWakeActions.length === 0) {
      console.log("[Wake Timer] No future wake actions scheduled, deleting wake timer");
      return await deleteWakeTimer();
    }

    // Schedule wake timer for the next wake action
    const nextWakeAction = futureWakeActions[0];
    const wakeTime = new Date((nextWakeAction.nextRun || 0) * 1000);

    console.log(`[Wake Timer] Scheduling wake timer for next wake action at ${wakeTime.toISOString()}`);
    const result = await scheduleWakeTimer(wakeTime);

    if (result.success) {
      console.log(`[Wake Timer] Wake timer successfully scheduled for ${wakeTime.toLocaleString()}`);
    } else {
      console.error(`[Wake Timer] Failed to schedule wake timer: ${result.message}`);
    }

    return result;
  } catch (error) {
    console.error("[Wake Timer] Error refreshing wake timer:", error);
    return {
      success: false,
      message: `Failed to refresh wake timer: ${(error as Error).message}`,
    };
  }
}
