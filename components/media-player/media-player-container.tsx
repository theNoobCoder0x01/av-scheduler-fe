"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseM3uContent } from "@/lib/playlist-utils";
import { PlaylistService } from "@/services/playlist.service";
import { Monitor, Music } from "lucide-react";
import { useState } from "react";
import AudioPlayer from "./audio-player";
import FileBrowser from "./file-browser";

interface MediaPlayerContainerProps {
  playlistPath?: string;
  autoPlay?: boolean;
}

export default function MediaPlayerContainer({ playlistPath, autoPlay = false }: MediaPlayerContainerProps) {
  const [currentTracks, setCurrentTracks] = useState<string[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [playerMode, setPlayerMode] = useState<"built-in" | "vlc">("built-in");

  // Load playlist from M3U file
  const loadPlaylistFromFile = async (filePath: string) => {
    try {
      // Read M3U file content (this would need to be implemented via API)
      // For now, we'll simulate loading tracks
      const tracks = [filePath]; // Placeholder
      setCurrentTracks(tracks);
      setCurrentTrackIndex(0);
    } catch (error) {
      console.error("Error loading playlist:", error);
    }
  };

  const handleFileSelect = (filePath: string) => {
    setCurrentTracks([filePath]);
    setCurrentTrackIndex(0);
  };

  const handlePlaylistSelect = (files: string[]) => {
    setCurrentTracks(files);
    setCurrentTrackIndex(0);
  };

  const handleTrackChange = (track: string, index: number) => {
    setCurrentTrackIndex(index);
  };

  return (
    <div className="space-y-6">
      {/* Player Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Media Player</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button
              variant={playerMode === "built-in" ? "default" : "outline"}
              onClick={() => setPlayerMode("built-in")}
            >
              <Music className="h-4 w-4 mr-2" />
              Built-in Player
            </Button>
            <Button
              variant={playerMode === "vlc" ? "default" : "outline"}
              onClick={() => setPlayerMode("vlc")}
            >
              <Monitor className="h-4 w-4 mr-2" />
              VLC Player
            </Button>
          </div>
        </CardContent>
      </Card>

      {playerMode === "built-in" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Browser */}
          <FileBrowser
            onFileSelect={handleFileSelect}
            onPlaylistSelect={handlePlaylistSelect}
            mediaOnly={true}
          />

          {/* Audio Player */}
          <div className="space-y-4">
            {currentTracks.length > 0 ? (
              <AudioPlayer
                tracks={currentTracks}
                initialTrackIndex={currentTrackIndex}
                onTrackChange={handleTrackChange}
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-muted-foreground">
                    <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a media file or playlist to start playing</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current Playlist */}
            {currentTracks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Playlist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {currentTracks.map((track, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded cursor-pointer hover:bg-accent ${
                          index === currentTrackIndex ? "bg-accent" : ""
                        }`}
                        onClick={() => setCurrentTrackIndex(index)}
                      >
                        <div className="flex items-center">
                          <span className="text-sm text-muted-foreground mr-3">
                            {index + 1}
                          </span>
                          <span className="flex-1 truncate">
                            {track.split('/').pop()?.replace(/\.[^/.]+$/, "") || "Unknown Track"}
                          </span>
                          {index === currentTrackIndex && (
                            <Music className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>VLC Player mode selected</p>
              <p className="text-sm">Media will be controlled through VLC application</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}