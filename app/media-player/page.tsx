"use client";

import MediaPlayerContainer from "@/components/media-player/media-player-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WebSocketService } from "@/services/web-socket.service";
import { ArrowLeft, Music } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function MediaPlayerPage() {
  const searchParams = useSearchParams();
  const [playlistPath, setPlaylistPath] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);

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

  console.log("🎵 Rendering media player page with playlist:", playlistPath, "autoPlay:", autoPlay);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Music className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">BAPS Media Player</h1>
          </div>
          <Button variant="outline" onClick={handleClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Close Player
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        {playlistPath ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Now Playing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Playlist: {playlistPath.split('/').pop()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Path: {playlistPath}
                </p>
                {autoPlay && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ▶️ Auto-playing from scheduler
                  </p>
                )}
              </CardContent>
            </Card>
            
            <MediaPlayerContainer 
              playlistPath={playlistPath} 
              autoPlay={autoPlay}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Music className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Playlist Loaded</h2>
                <p className="text-muted-foreground text-center">
                  This media player window will automatically load content when triggered by scheduled actions.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Debug: Waiting for playlist data...
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}