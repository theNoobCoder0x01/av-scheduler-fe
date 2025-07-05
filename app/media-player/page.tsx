"use client";

import MediaPlayerContainer from "@/components/media-player/media-player-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WebSocketService } from "@/services/web-socket.service";
import { 
  ArrowLeft, 
  Music, 
  FolderOpen, 
  FileMusic, 
  Settings,
  Minimize,
  Maximize,
  X
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function MediaPlayerPage() {
  const searchParams = useSearchParams();
  const [playlistPath, setPlaylistPath] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [showFileExplorer, setShowFileExplorer] = useState<boolean>(false);

  useEffect(() => {
    console.log("🎵 Media Player Page: Initializing");
    
    // Get playlist from URL parameters
    const playlist = searchParams.get('playlist');
    const autoPlayParam = searchParams.get('autoPlay');
    
    console.log("🎵 URL params - playlist:", playlist, "autoPlay:", autoPlayParam);
    
    if (playlist) {
      const decodedPlaylist = decodeURIComponent(playlist);
      console.log("🎵 Setting playlist from URL:", decodedPlaylist);
      setPlaylistPath(decodedPlaylist);
      setAutoPlay(autoPlayParam === 'true');
    }

    // Listen for playlist loading events from Electron
    if (typeof window !== 'undefined' && window.electron?.onLoadPlaylist) {
      console.log("🎵 Setting up Electron playlist listener");
      window.electron.onLoadPlaylist((data: { playlistPath: string; autoPlay: boolean }) => {
        console.log("🎵 Received playlist from Electron:", data);
        setPlaylistPath(data.playlistPath);
        setAutoPlay(data.autoPlay);
      });

      // Cleanup listeners on unmount
      return () => {
        if (window.electron?.removeAllListeners) {
          window.electron.removeAllListeners('load-playlist');
        }
      };
    }
  }, [searchParams]);

  // Listen for WebSocket commands from backend
  useEffect(() => {
    console.log("🎵 Setting up WebSocket connection");
    WebSocketService.connect();

    const handleMediaPlayerCommand = (data: any) => {
      console.log("📡 Received WebSocket data:", data);
      
      if (data.type === "mediaPlayerCommand") {
        console.log("📡 Received media player command:", data.command);
        
        switch (data.command) {
          case "loadAndPlay":
            if (data.data?.playlistPath) {
              console.log("📡 Loading and playing playlist:", data.data.playlistPath);
              setPlaylistPath(data.data.playlistPath);
              setAutoPlay(true);
            }
            break;
          case "pause":
            console.log("📡 Received pause command");
            // This will be handled by the media player components
            break;
          case "stop":
            console.log("📡 Received stop command");
            // This will be handled by the media player components
            break;
        }
      }
    };

    WebSocketService.addListener(handleMediaPlayerCommand);

    return () => {
      WebSocketService.removeListener(handleMediaPlayerCommand);
    };
  }, []);

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.electron?.closeMediaPlayer) {
      window.electron.closeMediaPlayer();
    } else {
      // Fallback for web environment
      window.close();
    }
  };

  const handleMinimize = () => {
    // In a real Electron app, you'd implement window minimize
    console.log("Minimize window");
  };

  const handleMaximize = () => {
    // In a real Electron app, you'd implement window maximize/restore
    console.log("Maximize/restore window");
  };

  const handleOpenFile = () => {
    setShowFileExplorer(true);
  };

  const handleOpenPlaylist = () => {
    setShowFileExplorer(true);
  };

  console.log("🎵 Rendering media player page with playlist:", playlistPath, "autoPlay:", autoPlay);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mac-style Menu Bar */}
      <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 py-2 text-sm">
        {/* Left side - App controls */}
        <div className="flex items-center space-x-3">
          {/* Traffic light buttons */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleClose}
              className="w-3 h-3 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center group"
            >
              <X className="w-2 h-2 text-red-800 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button 
              onClick={handleMinimize}
              className="w-3 h-3 bg-yellow-500 hover:bg-yellow-600 rounded-full flex items-center justify-center group"
            >
              <Minimize className="w-2 h-2 text-yellow-800 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button 
              onClick={handleMaximize}
              className="w-3 h-3 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center group"
            >
              <Maximize className="w-2 h-2 text-green-800 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
          
          {/* App title */}
          <span className="font-medium text-gray-700 dark:text-gray-300">BAPS Media Player</span>
        </div>

        {/* Center - Menu items */}
        <div className="flex items-center space-x-6">
          <button 
            onClick={handleOpenFile}
            className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Open File</span>
          </button>
          <button 
            onClick={handleOpenPlaylist}
            className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <FileMusic className="w-4 h-4" />
            <span>Open Playlist</span>
          </button>
          <button className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <Settings className="w-4 h-4" />
            <span>Preferences</span>
          </button>
        </div>

        {/* Right side - Window controls (optional) */}
        <div className="w-20"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* File Explorer Sidebar (when shown) */}
        {showFileExplorer && (
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm font-medium">File Explorer</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowFileExplorer(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="h-[calc(100vh-120px)]">
              <MediaPlayerContainer 
                playlistPath={playlistPath} 
                autoPlay={autoPlay}
                showFileExplorerOnly={true}
                onFileSelect={(filePath) => {
                  setPlaylistPath(filePath);
                  setAutoPlay(false);
                  setShowFileExplorer(false);
                }}
                onPlaylistSelect={(files) => {
                  // Handle multiple file selection
                  if (files.length > 0) {
                    setPlaylistPath(files[0]);
                    setAutoPlay(false);
                    setShowFileExplorer(false);
                  }
                }}
                onPlaylistFileSelect={(playlistPath) => {
                  setPlaylistPath(playlistPath);
                  setAutoPlay(false);
                  setShowFileExplorer(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Media Player Area */}
        <div className="flex-1 flex flex-col">
          {playlistPath ? (
            <div className="flex-1 p-4">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Music className="h-5 w-5" />
                      Now Playing
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {playlistPath.split('/').pop()}
                    </p>
                  </div>
                  {!showFileExplorer && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFileExplorer(true)}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Browse Files
                    </Button>
                  )}
                </div>
                {autoPlay && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ▶️ Auto-playing from scheduler
                  </p>
                )}
              </div>
              
              <MediaPlayerContainer 
                playlistPath={playlistPath} 
                autoPlay={autoPlay}
                showFileExplorerOnly={false}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Card className="w-full max-w-md mx-4">
                <CardContent className="flex flex-col items-center justify-center p-8">
                  <Music className="h-16 w-16 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No Media Loaded</h2>
                  <p className="text-muted-foreground text-center mb-4">
                    Open a file or playlist to start playing media.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleOpenFile} variant="default">
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Open File
                    </Button>
                    <Button onClick={handleOpenPlaylist} variant="outline">
                      <FileMusic className="h-4 w-4 mr-2" />
                      Open Playlist
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}