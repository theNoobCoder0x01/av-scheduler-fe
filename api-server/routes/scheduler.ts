import express from "express";
import { SchedulerService } from "../services/scheduler.service";

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
