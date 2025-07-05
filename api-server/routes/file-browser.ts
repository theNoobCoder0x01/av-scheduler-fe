import express from "express";
import fs from "fs";
import os from "os";
import path from "path";

const fileBrowserRouter = express.Router();

// Get directory contents
fileBrowserRouter.get("/browse", (req, res) => {
  try {
    const requestedPath = req.query.path as string;
    let targetPath: string;

    if (!requestedPath) {
      // Default to user's home directory
      targetPath = os.homedir();
    } else {
      targetPath = requestedPath;
    }

    // Security check - ensure path exists
    if (!fs.existsSync(targetPath)) {
      res.status(404).json({ error: "Directory not found" });
      return;
    }

    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
      res.status(400).json({ error: "Path is not a directory" });
      return;
    }

    const items = fs.readdirSync(targetPath).map((item) => {
      const itemPath = path.join(targetPath, item);
      const itemStat = fs.statSync(itemPath);
      const ext = path.extname(item).toLowerCase();

      // Check if it's a media file
      const mediaExtensions = [
        ".mp3",
        ".mp4",
        ".wav",
        ".flac",
        ".aac",
        ".ogg",
        ".webm",
        ".m4a",
        ".mov",
        ".avi",
      ];
      const isMediaFile = mediaExtensions.includes(ext);

      return {
        name: item,
        path: itemPath,
        isDirectory: itemStat.isDirectory(),
        isMediaFile,
        size: itemStat.size,
        lastModified: itemStat.mtime,
        extension: ext,
      };
    });

    // Sort: directories first, then files
    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    // Get parent directory info
    const parentPath = path.dirname(targetPath);
    const canGoUp = targetPath !== path.parse(targetPath).root;

    res.json({
      message: "Directory contents retrieved successfully",
      data: {
        currentPath: targetPath,
        parentPath: canGoUp ? parentPath : null,
        items,
      },
    });
  } catch (error) {
    console.error("Error browsing directory:", error);
    res.status(500).json({ error: "Failed to browse directory" });
  }
});

// Get system drives/volumes (for Windows/Mac)
fileBrowserRouter.get("/drives", (req, res) => {
  try {
    const drives: Array<{ name: string; path: string; type: string }> = [];

    if (process.platform === "win32") {
      // Windows drives
      for (let i = 65; i <= 90; i++) {
        const drive = String.fromCharCode(i) + ":\\";
        try {
          if (fs.existsSync(drive)) {
            drives.push({
              name: `Drive ${String.fromCharCode(i)}:`,
              path: drive,
              type: "drive",
            });
          }
        } catch (e) {
          // Drive not accessible
        }
      }
    } else {
      // Unix-like systems
      drives.push({
        name: "Root",
        path: "/",
        type: "root",
      });

      // Add common mount points
      const commonPaths = [
        { name: "Home", path: os.homedir() },
        { name: "Desktop", path: path.join(os.homedir(), "Desktop") },
        { name: "Documents", path: path.join(os.homedir(), "Documents") },
        { name: "Music", path: path.join(os.homedir(), "Music") },
        { name: "Videos", path: path.join(os.homedir(), "Videos") },
      ];

      commonPaths.forEach(({ name, path: dirPath }) => {
        if (fs.existsSync(dirPath)) {
          drives.push({
            name,
            path: dirPath,
            type: "folder",
          });
        }
      });
    }

    res.json({
      message: "System drives retrieved successfully",
      data: drives,
    });
  } catch (error) {
    console.error("Error getting system drives:", error);
    res.status(500).json({ error: "Failed to get system drives" });
  }
});

// Search for media files
fileBrowserRouter.get("/search", (req, res) => {
  try {
    const searchPath = req.query.path as string;
    const query = req.query.q as string;
    const mediaOnly = req.query.mediaOnly === "true";

    if (!searchPath || !query) {
      res.status(400).json({ error: "Path and query are required" });
      return;
    }

    if (!fs.existsSync(searchPath)) {
      res.status(404).json({ error: "Search path not found" });
      return;
    }

    const results: Array<{
      name: string;
      path: string;
      isDirectory: boolean;
      isMediaFile: boolean;
      size: number;
      lastModified: Date;
    }> = [];

    const mediaExtensions = [
      ".mp3",
      ".mp4",
      ".wav",
      ".flac",
      ".aac",
      ".ogg",
      ".webm",
      ".m4a",
      ".mov",
      ".avi",
    ];

    function searchRecursive(dirPath: string, depth = 0) {
      if (depth > 3) return; // Limit search depth

      try {
        const items = fs.readdirSync(dirPath);

        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stat = fs.statSync(itemPath);

          if (item.toLowerCase().includes(query.toLowerCase())) {
            const ext = path.extname(item).toLowerCase();
            const isMediaFile = mediaExtensions.includes(ext);

            if (!mediaOnly || isMediaFile || stat.isDirectory()) {
              results.push({
                name: item,
                path: itemPath,
                isDirectory: stat.isDirectory(),
                isMediaFile,
                size: stat.size,
                lastModified: stat.mtime,
              });
            }
          }

          if (stat.isDirectory() && results.length < 100) {
            searchRecursive(itemPath, depth + 1);
          }
        }
      } catch (e) {
        // Skip inaccessible directories
      }
    }

    searchRecursive(searchPath);

    res.json({
      message: "Search completed successfully",
      data: {
        query,
        searchPath,
        results: results.slice(0, 100), // Limit results
      },
    });
  } catch (error) {
    console.error("Error searching files:", error);
    res.status(500).json({ error: "Failed to search files" });
  }
});

export default fileBrowserRouter;
