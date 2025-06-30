import express from "express";
import { SchedulerService } from "../services/scheduler.service";
import { controlVlc } from "../lib/vlc-controller";

const schedulerRoutes = express.Router();

schedulerRoutes.get("/", async (req, res) => {
  try {
    const scheduledActions = await SchedulerService.getAllScheduledActions();
    res.status(200).json({
      message: "Scheduled actions fetched successfully",
      data: scheduledActions,
    });
  } catch (err: any) {
    console.error("Error fetching scheduled actions:", err);
    res.status(500).json({
      message: "Failed to fetch scheduled actions",
      error: err.message,
    });
  }
});

schedulerRoutes.get("/:id", async (req, res) => {
  try {
    const scheduledAction = await SchedulerService.getScheduledActionById(
      parseInt(req.params.id ?? "")
    );
    res.status(200).json({
      message: "Scheduled action fetched successfully",
      data: scheduledAction,
    });
  } catch (err: any) {
    console.error("Error fetching action:", err);
    res.status(500).json({
      message: "Failed to fetch action",
      error: err.message,
    });
  }
});

schedulerRoutes.post("/", async (req, res) => {
  try {
    const newRow = await SchedulerService.createScheduledAction(req.body);
    res.status(201).json({
      message: "Scheduled action created successfully",
      data: newRow,
    });
  } catch (err: any) {
    console.error("Error creating scheduled action:", err);
    res.status(500).json({
      message: "Failed to create scheduled action",
      error: err.message,
    });
  }
});

// Execute scheduled action manually
schedulerRoutes.post("/execute/:id", async (req, res) => {
  try {
    const actionId = parseInt(req.params.id ?? "");
    const { actionType, eventName } = req.body;

    if (!actionId) {
      res.status(400).json({
        success: false,
        message: "Action ID is required",
      });
      return;
    }

    if (!actionType) {
      res.status(400).json({
        success: false,
        message: "Action type is required",
      });
      return;
    }

    console.log(`🎯 Manually executing scheduled action ${actionId}: ${actionType} for ${eventName || 'current event'}`);

    // Execute the action using the same logic as the scheduler
    const result = await controlVlc(actionType, eventName);

    if (result.success) {
      // Update the last run time for this action
      const now = Math.floor(Date.now() / 1000);
      await SchedulerService.patchScheduledAction(actionId, {
        lastRun: now,
      });

      console.log(`✅ Manual execution successful: ${result.message}`);
    } else {
      console.log(`❌ Manual execution failed: ${result.message}`);
    }

    res.status(200).json({
      success: result.success,
      message: result.message,
      executedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error executing scheduled action:", err);
    res.status(500).json({
      success: false,
      message: "Failed to execute scheduled action",
      error: err.message,
    });
  }
});

schedulerRoutes.put("/:id", async (req, res) => {
  try {
    const updatedRow = await SchedulerService.updateScheduledAction(
      parseInt(req.params.id ?? ""),
      req.body
    );

    res.status(200).json({
      message: "Scheduled action updated successfully",
      data: updatedRow,
    });
  } catch (err: any) {
    console.error("Error updating scheduled action:", err);
    res.status(500).json({
      message: "Failed to update scheduled action",
      error: err.message,
    });
  }
});

schedulerRoutes.patch("/:id", async (req, res) => {
  try {
    const updatedRow = await SchedulerService.patchScheduledAction(
      parseInt(req.params.id ?? ""),
      req.body
    );

    res.status(200).json({
      message: "Scheduled action patched successfully",
      data: updatedRow,
    });
  } catch (err: any) {
    console.error("Error patching scheduled action:", err);
    res.status(500).json({
      message: "Failed to patch scheduled action",
      error: err.message,
    });
  }
});

schedulerRoutes.delete("/:id", async (req, res) => {
  try {
    const dbResponse = await SchedulerService.deleteScheduledAction(
      parseInt(req.params.id ?? "")
    );

    // Send response
    res.status(200).json({
      message: "Scheduled action deleted successfully",
      data: dbResponse,
    });
  } catch (err: any) {
    console.error("Error deleting scheduled action:", err);
    res.status(500).json({
      message: "Failed to delete scheduled action",
      error: err.message,
    });
  }
});

export default schedulerRoutes;