import express from "express";
import fs from "fs";
import path from "path";
import { getSettings } from "../lib/settings";

const playlistsRouter = express.Router();

// GET all playlists in the configured folder
playlistsRouter.get("/", async (req, res) => {
  try {
    const settings = getSettings();
    const playlistFolderPath = settings.playlistFolderPath;

    // Check if the playlist folder exists
    if (!fs.existsSync(playlistFolderPath)) {
      res.status(200).json({
        message: "Playlist folder not found",
        data: [],
        folderPath: playlistFolderPath,
      });
      return;
    }

    // Read all files in the playlist folder
    const files = fs.readdirSync(playlistFolderPath);
    
    // Filter for .m3u files and get their details
    const playlists = files
      .filter(file => file.toLowerCase().endsWith('.m3u'))
      .map(file => {
        const filePath = path.join(playlistFolderPath, file);
        const stats = fs.statSync(filePath);
        
        return {
          name: file,
          nameWithoutExtension: path.parse(file).name,
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

    res.status(200).json({
      message: "Playlists fetched successfully",
      data: playlists,
      folderPath: playlistFolderPath,
      count: playlists.length,
    });
  } catch (err: any) {
    console.error("Error fetching playlists:", err);
    res.status(500).json({
      message: "Failed to fetch playlists",
      error: err.message,
    });
  }
});

// GET playlist by name (check if specific playlist exists)
playlistsRouter.get("/check/:name", async (req, res) => {
  try {
    const playlistName = decodeURIComponent(req.params.name);
    const settings = getSettings();
    const playlistFolderPath = settings.playlistFolderPath;

    // Generate possible filenames for the playlist
    const { generatePlaylistFilenames } = require("../lib/vlc-controller");
    const possibleFilenames = generatePlaylistFilenames(playlistName);
    
    const foundPlaylists = [];
    
    for (const filename of possibleFilenames) {
      const filePath = path.join(playlistFolderPath, filename);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        foundPlaylists.push({
          name: filename,
          nameWithoutExtension: path.parse(filename).name,
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        });
      }
    }

    res.status(200).json({
      message: foundPlaylists.length > 0 ? "Playlist found" : "Playlist not found",
      data: foundPlaylists,
      searchedFor: playlistName,
      possibleFilenames,
      found: foundPlaylists.length > 0,
    });
  } catch (err: any) {
    console.error("Error checking playlist:", err);
    res.status(500).json({
      message: "Failed to check playlist",
      error: err.message,
    });
  }
});

// POST create new playlist
playlistsRouter.post("/create", async (req, res) => {
  try {
    const { name, tracks, savePath, eventId } = req.body;

    if (!name || !tracks || !Array.isArray(tracks) || tracks.length === 0) {
      res.status(400).json({
        success: false,
        message: "Invalid request: name and tracks array are required",
      });
      return;
    }

    const settings = getSettings();
    const targetPath = savePath || settings.playlistFolderPath;

    // Ensure the target directory exists
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }

    // Clean filename for file system compatibility
    const cleanName = name.replace(/[<>:"/\\|?*]/g, "_");
    const fileName = cleanName.endsWith('.m3u') ? cleanName : `${cleanName}.m3u`;
    const filePath = path.join(targetPath, fileName);

    // Generate M3U content
    let m3uContent = "#EXTM3U\n";
    
    for (const trackPath of tracks) {
      // Extract filename from path for display
      const trackName = path.basename(trackPath);
      const nameWithoutExt = path.parse(trackName).name;
      
      // Add EXTINF line with track info
      m3uContent += `#EXTINF:-1,${nameWithoutExt}\n`;
      m3uContent += `${trackPath}\n`;
    }

    // Write the playlist file
    fs.writeFileSync(filePath, m3uContent, 'utf8');

    console.log(`✅ Playlist created: ${filePath}`);

    res.status(201).json({
      success: true,
      filePath,
      message: `Playlist "${fileName}" created successfully with ${tracks.length} tracks`,
      data: {
        name: fileName,
        path: filePath,
        trackCount: tracks.length,
        eventId: eventId || null,
      },
    });
  } catch (err: any) {
    console.error("Error creating playlist:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create playlist",
      error: err.message,
    });
  }
});

export default playlistsRouter;