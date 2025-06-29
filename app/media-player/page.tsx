"use client";

import MediaPlayerContainer from "@/components/media-player/media-player-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Music } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function MediaPlayerPage() {
  const searchParams = useSearchParams();
  const [playlistPath, setPlaylistPath] = useState<string | null>(null);

  useEffect(() => {
    // Get playlist from URL parameters
    const playlist = searchParams.get('playlist');
    if (playlist) {
      setPlaylistPath(decodeURIComponent(playlist));
    }

    // Listen for playlist loading events from Electron
    if (typeof window !== 'undefined' && window.electron?.onLoadPlaylist) {
      window.electron.onLoadPlaylist((path: string) => {
        setPlaylistPath(path);
      });

      // Cleanup listeners on unmount
      return () => {
        if (window.electron?.removeAllListeners) {
          window.electron.removeAllListeners('load-playlist');
        }
      };
    }
  }, [searchParams]);

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.electron?.closeMediaPlayer) {
      window.electron.closeMediaPlayer();
    } else {
      // Fallback for web environment
      window.close();
    }
  };

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
              </CardContent>
            </Card>
            
            <MediaPlayerContainer playlistPath={playlistPath} autoPlay={true} />
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
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}