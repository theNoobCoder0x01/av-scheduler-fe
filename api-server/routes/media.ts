import express from "express";
import fs from "fs";
import path from "path";
import { getSettings } from "../lib/settings";

const mediaRouter = express.Router();

// Enhanced media extensions support
const SUPPORTED_MEDIA_EXTENSIONS = {
  video: [
    '.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.3gp', '.m4v',
    '.mpg', '.mpeg', '.ogv', '.ts', '.mts', '.m2ts', '.vob', '.rm', '.rmvb', '.asf',
    '.divx', '.xvid', '.f4v', '.m2v', '.mxf', '.roq', '.nsv'
  ],
  audio: [
    '.mp3', '.wav', '.flac', '.aac', '.m4a', '.wma', '.opus', '.amr', '.ac3', '.dts',
    '.ape', '.au', '.ra', '.tta', '.tak', '.mpc', '.wv', '.spx', '.gsm', '.aiff',
    '.caf', '.w64', '.rf64', '.voc', '.ircam', '.mat4', '.mat5', '.pvf',
    '.xi', '.htk', '.sds', '.avr', '.wavex', '.sd2', '.fap'
  ]
};

const ALL_MEDIA_EXTENSIONS = [...SUPPORTED_MEDIA_EXTENSIONS.video, ...SUPPORTED_MEDIA_EXTENSIONS.audio];

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

    // Check if file is a supported media file
    const ext = path.extname(filePath).toLowerCase();
    
    if (!ALL_MEDIA_EXTENSIONS.includes(ext)) {
      console.error("❌ Not a supported media file:", ext);
      res.status(400).json({ error: "Not a supported media file" });
      return;
    }

    // Set appropriate content type
    const contentTypes: { [key: string]: string } = {
      // Video formats
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.ogv': 'video/ogg',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.3gp': 'video/3gpp',
      '.m4v': 'video/x-m4v',
      '.mpg': 'video/mpeg',
      '.mpeg': 'video/mpeg',
      '.ts': 'video/mp2t',
      '.mts': 'video/mp2t',
      '.m2ts': 'video/mp2t',
      '.vob': 'video/dvd',
      '.rm': 'application/vnd.rn-realmedia',
      '.rmvb': 'application/vnd.rn-realmedia-vbr',
      '.asf': 'video/x-ms-asf',
      '.divx': 'video/divx',
      '.xvid': 'video/x-xvid',
      '.f4v': 'video/x-f4v',
      '.m2v': 'video/mpeg',
      
      // Audio formats
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac',
      '.aac': 'audio/aac',
      '.m4a': 'audio/mp4',
      '.wma': 'audio/x-ms-wma',
      '.opus': 'audio/opus',
      '.amr': 'audio/amr',
      '.ac3': 'audio/ac3',
      '.dts': 'audio/dts',
      '.ape': 'audio/x-ape',
      '.au': 'audio/basic',
      '.ra': 'audio/x-realaudio',
      '.tta': 'audio/x-tta',
      '.tak': 'audio/x-tak',
      '.mpc': 'audio/x-musepack',
      '.wv': 'audio/x-wavpack',
      '.spx': 'audio/speex',
      '.gsm': 'audio/gsm',
      '.aiff': 'audio/aiff',
      '.caf': 'audio/x-caf',
      '.w64': 'audio/x-w64',
      '.rf64': 'audio/x-rf64',
      '.voc': 'audio/x-voc'
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
    
    // Determine if it's audio or video
    const isVideo = SUPPORTED_MEDIA_EXTENSIONS.video.includes(ext);
    const isAudio = SUPPORTED_MEDIA_EXTENSIONS.audio.includes(ext);
    
    const metadata = {
      name: path.basename(filePath),
      path: filePath,
      size: stat.size,
      extension: ext,
      lastModified: stat.mtime,
      duration: null, // Could be enhanced with media metadata extraction
      isAudio,
      isVideo
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