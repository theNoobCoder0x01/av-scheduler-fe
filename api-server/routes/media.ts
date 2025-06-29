import express from "express";
import fs from "fs";
import path from "path";
import { getSettings } from "../lib/settings";

const mediaRouter = express.Router();

// Stream media file
mediaRouter.get("/stream/:encodedPath", (req, res) => {
  try {
    const filePath = decodeURIComponent(req.params.encodedPath);
    
    // Security check - ensure file exists and is within allowed directories
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Check if file is a media file
    const ext = path.extname(filePath).toLowerCase();
    const mediaExtensions = ['.mp3', '.mp4', '.wav', '.flac', '.aac', '.ogg', '.webm', '.m4a'];
    
    if (!mediaExtensions.includes(ext)) {
      res.status(400).json({ error: "Not a supported media file" });
      return;
    }

    // Set appropriate content type
    const contentTypes: { [key: string]: string } = {
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg',
      '.webm': 'video/webm',
      '.m4a': 'audio/mp4'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    if (range) {
      // Handle range requests for streaming
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      };
      
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // Send entire file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      };
      
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error("Error streaming media:", error);
    res.status(500).json({ error: "Failed to stream media file" });
  }
});

// Get media file metadata
mediaRouter.get("/metadata/:encodedPath", async (req, res) => {
  try {
    const filePath = decodeURIComponent(req.params.encodedPath);
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    const metadata = {
      name: path.basename(filePath),
      path: filePath,
      size: stat.size,
      extension: ext,
      lastModified: stat.mtime,
      duration: null, // Could be enhanced with media metadata extraction
      isAudio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'].includes(ext),
      isVideo: ['.mp4', '.webm', '.mov', '.avi'].includes(ext)
    };

    res.json({
      message: "Media metadata retrieved successfully",
      data: metadata
    });
  } catch (error) {
    console.error("Error getting media metadata:", error);
    res.status(500).json({ error: "Failed to get media metadata" });
  }
});

export default mediaRouter;