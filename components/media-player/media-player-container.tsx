"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseM3uContent } from "@/lib/playlist-utils";
import { PlaylistService } from "@/services/playlist.service";
import { Monitor, Music, Video } from "lucide-react";
import { useState } from "react";
import AudioPlayer from "./audio-player";
import VideoPlayer from "./video-player";
import FileBrowser from "./file-browser";

interface MediaPlayerContainerProps {
  playlistPath?: string;
  autoPlay?: boolean;
}

export default function MediaPlayerContainer({ playlistPath, autoPlay = false }: MediaPlayerContainerProps) {
  const [currentTracks, setCurrentTracks] = useState<string[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [playerMode, setPlayerMode] = useState<"built-in" | "vlc">("built-in");
  const [mediaPlayerType, setMediaPlayerType] = useState<"auto" | "audio" | "video">("auto");

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

  // Determine which player to use based on file type and user preference
  const getPlayerComponent = () => {
    if (currentTracks.length === 0) return null;

    const currentTrack = currentTracks[currentTrackIndex];
    const ext = currentTrack?.split('.').pop()?.toLowerCase() || '';
    
    // Video extensions that should use video player
    const videoExtensions = [
      'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'wmv', 'flv', 
      '3gp', 'm4v', 'mpg', 'mpeg', 'ogv', 'ts', 'mts', 'm2ts'
    ];
    
    // Audio extensions that should use audio player
    const audioExtensions = [
      'mp3', 'wav', 'flac', 'aac', 'm4a', 'wma', 'opus', 'amr'
    ];

    const isVideo = videoExtensions.includes(ext);
    const isAudio = audioExtensions.includes(ext);

    // Auto-detect or use user preference
    if (mediaPlayerType === "video" || (mediaPlayerType === "auto" && isVideo)) {
      return (
        <VideoPlayer
          tracks={currentTracks}
          initialTrackIndex={currentTrackIndex}
          onTrackChange={handleTrackChange}
        />
      );
    } else if (mediaPlayerType === "audio" || (mediaPlayerType === "auto" && isAudio)) {
      return (
        <AudioPlayer
          tracks={currentTracks}
          initialTrackIndex={currentTrackIndex}
          onTrackChange={handleTrackChange}
        />
      );
    } else {
      // Default to video player for unknown formats
      return (
        <VideoPlayer
          tracks={currentTracks}
          initialTrackIndex={currentTrackIndex}
          onTrackChange={handleTrackChange}
        />
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Player Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Media Player Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Player Mode */}
            <div>
              <label className="text-sm font-medium mb-2 block">Player Mode</label>
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
            </div>

            {/* Media Player Type (only for built-in) */}
            {playerMode === "built-in" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Media Player Type</label>
                <div className="flex space-x-4">
                  <Button
                    variant={mediaPlayerType === "auto" ? "default" : "outline"}
                    onClick={() => setMediaPlayerType("auto")}
                    size="sm"
                  >
                    Auto-detect
                  </Button>
                  <Button
                    variant={mediaPlayerType === "audio" ? "default" : "outline"}
                    onClick={() => setMediaPlayerType("audio")}
                    size="sm"
                  >
                    <Music className="h-4 w-4 mr-2" />
                    Audio Only
                  </Button>
                  <Button
                    variant={mediaPlayerType === "video" ? "default" : "outline"}
                    onClick={() => setMediaPlayerType("video")}
                    size="sm"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Video Player
                  </Button>
                </div>
              </div>
            )}
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

          {/* Media Player */}
          <div className="space-y-4">
            {currentTracks.length > 0 ? (
              getPlayerComponent()
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a media file or playlist to start playing</p>
                    <p className="text-xs mt-2 opacity-75">
                      Supports: MP4, WebM, MOV, AVI, MP3, WAV, FLAC, AAC and more
                    </p>
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
                    {currentTracks.map((track, index) => {
                      const ext = track.split('.').pop()?.toLowerCase() || '';
                      const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'wmv', 'flv', '3gp', 'm4v'];
                      const isVideo = videoExtensions.includes(ext);
                      
                      return (
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
                            {isVideo ? (
                              <Video className="h-4 w-4 mr-2 text-blue-500" />
                            ) : (
                              <Music className="h-4 w-4 mr-2 text-green-500" />
                            )}
                            <span className="flex-1 truncate">
                              {track.split('/').pop()?.replace(/\.[^/.]+$/, "") || "Unknown Track"}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2 uppercase">
                              {ext}
                            </span>
                            {index === currentTrackIndex && (
                              <div className="ml-2 h-2 w-2 bg-primary rounded-full animate-pulse" />
                            )}
                          </div>
                        </div>
                      );
                    })}
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