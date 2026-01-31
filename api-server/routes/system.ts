import express from "express";
import { getSleepCapabilities } from "../lib/sleep-mode-detector";
import { isRunningAsAdmin } from "../lib/wake-timer-scheduler";

const systemRouter = express.Router();

/**
 * GET /api/system/sleep-capabilities
 * Returns information about the system's sleep mode capabilities
 */
systemRouter.get("/sleep-capabilities", async (req, res) => {
  try {
    const capabilities = await getSleepCapabilities();
    const isAdmin = await isRunningAsAdmin();

    res.json({
      message: "Sleep capabilities retrieved successfully",
      data: {
        ...capabilities,
        isRunningAsAdmin: isAdmin,
      },
    });
  } catch (error) {
    console.error("Error fetching sleep capabilities:", error);
    res.status(500).json({
      error: "Failed to fetch sleep capabilities",
      message: (error as Error).message,
    });
  }
});

/**
 * POST /api/system/refresh-sleep-capabilities
 * Forces a refresh of sleep capability detection
 */
systemRouter.post("/refresh-sleep-capabilities", async (req, res) => {
  try {
    const capabilities = await getSleepCapabilities(true); // Force refresh
    const isAdmin = await isRunningAsAdmin();

    res.json({
      message: "Sleep capabilities refreshed successfully",
      data: {
        ...capabilities,
        isRunningAsAdmin: isAdmin,
      },
    });
  } catch (error) {
    console.error("Error refreshing sleep capabilities:", error);
    res.status(500).json({
      error: "Failed to refresh sleep capabilities",
      message: (error as Error).message,
    });
  }
});

export default systemRouter;
