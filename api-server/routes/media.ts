import express from "express";
import fs from "fs";
import path from "path";
import { getSettings } from "../lib/settings";

const mediaRouter = express.Router();

// Stream media file - Fixed route pattern
mediaRouter.get("/stream/:encodedPath(*)", (req, res) => {
  try {
    // Get the full path from the parameter
    const encodedPath = req.params.encodedPath;
    
    if (!encodedPath) {
      console.error("❌ No file path provided");
      res.status(400).json({ error: "File path is required" });
      return;
    }

    // Decode the path properly
    let filePath: string;
    try {
      filePath = decodeURIComponent(encodedPath);
    } catch (decodeError) {
      console.error("❌ Invalid encoded path:", encodedPath);
      res.status(400).json({ error: "Invalid file path encoding" });
      return;
    }
    
    console.log("🎵 Streaming request for:", filePath);
    
    // Security check - ensure file exists
    if (!fs.existsSync(filePath)) {
      console.error("❌ File not found:", filePath);
      res.status(404).json({ error: "File not found" });
      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    console.log("📊 File size:", fileSize, "Range:", range);

    // Check if file is a media file
    const ext = path.extname(filePath).toLowerCase();
    const mediaExtensions = ['.mp3', '.mp4', '.wav', '.flac', '.aac', '.ogg', '.webm', '.m4a', '.mov', '.avi'];
    
    if (!mediaExtensions.includes(ext)) {
      console.error("❌ Not a supported media file:", ext);
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
      '.m4a': 'audio/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set CORS headers for media streaming
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
    });

    if (range) {
      // Handle range requests for streaming
      console.log("🎯 Processing range request:", range);
      
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      // Validate range
      if (start >= fileSize || end >= fileSize || start > end) {
        console.error("❌ Invalid range:", start, "-", end, "for file size:", fileSize);
        res.status(416).set({
          'Content-Range': `bytes */${fileSize}`
        });
        return;
      }
      
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      };
      
      console.log("📤 Sending partial content:", start, "-", end, "/", fileSize);
      res.writeHead(206, head);
      
      file.on('error', (error) => {
        console.error("❌ Stream error:", error);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
      
      file.pipe(res);
    } else {
      // Send entire file
      console.log("📤 Sending entire file");
      const head = {
        'Content-Length': fileSize.toString(),
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      };
      
      res.writeHead(200, head);
      const stream = fs.createReadStream(filePath);
      
      stream.on('error', (error) => {
        console.error("❌ Stream error:", error);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
      
      stream.pipe(res);
    }
  } catch (error) {
    console.error("❌ Error streaming media:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to stream media file" });
    }
  }
});

// Handle OPTIONS requests for CORS
mediaRouter.options("/stream/:encodedPath(*)", (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  });
  res.status(200).end();
});

// Get media file metadata
mediaRouter.get("/metadata/:encodedPath(*)", async (req, res) => {
  try {
    const encodedPath = req.params.encodedPath;
    
    if (!encodedPath) {
      res.status(400).json({ error: "File path is required" });
      return;
    }

    let filePath: string;
    try {
      filePath = decodeURIComponent(encodedPath);
    } catch (decodeError) {
      res.status(400).json({ error: "Invalid file path encoding" });
      return;
    }
    
    console.log("📋 Metadata request for:", filePath);
    
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
    console.error("❌ Error getting media metadata:", error);
    res.status(500).json({ error: "Failed to get media metadata" });
  }
});

export default mediaRouter;