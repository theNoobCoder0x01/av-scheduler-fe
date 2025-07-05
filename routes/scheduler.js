"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const scheduler_service_1 = require("../services/scheduler.service");
const schedulerRoutes = express_1.default.Router();
schedulerRoutes.get("/", async (req, res) => {
  try {
    const scheduledActions =
      await scheduler_service_1.SchedulerService.getAllScheduledActions();
    res.status(200).json({
      message: "Scheduled actions fetched successfully",
      data: scheduledActions,
    });
  } catch (err) {
    console.error("Error fetching scheduled actions:", err);
    res.status(500).json({
      message: "Failed to fetch scheduled actions",
      error: err.message,
    });
  }
});
schedulerRoutes.get("/:id", async (req, res) => {
  try {
    const scheduledAction =
      await scheduler_service_1.SchedulerService.getScheduledActionById(
        parseInt(req.params.id ?? ""),
      );
    res.status(200).json({
      message: "Scheduled action fetched successfully",
      data: scheduledAction,
    });
  } catch (err) {
    console.error("Error fetching action:", err);
    res.status(500).json({
      message: "Failed to fetch action",
      error: err.message,
    });
  }
});
schedulerRoutes.post("/", async (req, res) => {
  try {
    const newRow =
      await scheduler_service_1.SchedulerService.createScheduledAction(
        req.body,
      );
    res.status(201).json({
      message: "Scheduled action created successfully",
      data: newRow,
    });
  } catch (err) {
    console.error("Error creating scheduled action:", err);
    res.status(500).json({
      message: "Failed to create scheduled action",
      error: err.message,
    });
  }
});
schedulerRoutes.put("/:id", async (req, res) => {
  try {
    const updatedRow =
      await scheduler_service_1.SchedulerService.updateScheduledAction(
        parseInt(req.params.id ?? ""),
        req.body,
      );
    res.status(200).json({
      message: "Scheduled action updated successfully",
      data: updatedRow,
    });
  } catch (err) {
    console.error("Error updating scheduled action:", err);
    res.status(500).json({
      message: "Failed to update scheduled action",
      error: err.message,
    });
  }
});
schedulerRoutes.patch("/:id", async (req, res) => {
  try {
    const updatedRow =
      await scheduler_service_1.SchedulerService.patchScheduledAction(
        parseInt(req.params.id ?? ""),
        req.body,
      );
    res.status(200).json({
      message: "Scheduled action patched successfully",
      data: updatedRow,
    });
  } catch (err) {
    console.error("Error patching scheduled action:", err);
    res.status(500).json({
      message: "Failed to patch scheduled action",
      error: err.message,
    });
  }
});
schedulerRoutes.delete("/:id", async (req, res) => {
  try {
    const dbResponse =
      await scheduler_service_1.SchedulerService.deleteScheduledAction(
        parseInt(req.params.id ?? ""),
      );
    // Send response
    res.status(200).json({
      message: "Scheduled action deleted successfully",
      data: dbResponse,
    });
  } catch (err) {
    console.error("Error deleting scheduled action:", err);
    res.status(500).json({
      message: "Failed to delete scheduled action",
      error: err.message,
    });
  }
});
exports.default = schedulerRoutes;
