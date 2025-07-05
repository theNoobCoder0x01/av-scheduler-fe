import express from "express";
import { getSettings, updateSettings } from "../lib/settings";

const settingsRouter = express.Router();

settingsRouter.get("/", (req, res) => {
  try {
    const settings = getSettings();
    res.json({
      message: "Settings retrieved successfully",
      data: settings,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve settings",
      error: (error as Error).message,
    });
  }
});

settingsRouter.patch("/", (req, res) => {
  try {
    const updatedSettings = updateSettings(req.body);
    res.json({
      message: "Settings updated successfully",
      data: updatedSettings,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update settings",
      error: (error as Error).message,
    });
  }
});

export default settingsRouter;
