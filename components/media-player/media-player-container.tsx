"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PlaylistService } from "@/services/playlist.service";
import { WebSocketService } from "@/services/web-socket.service";
import { Music, Video } from "lucide-react";
import { useEffect, useState } from "react";
import AudioPlayer from "./audio-player";
import FileBrowser from "./file-browser";
import VideoPlayer from "./video-player";

interface MediaPlayerContainerProps {
  playlistPath?: string;
  autoPlay?: boolean;
  showFileExplorerOnly?: boolean;
  onFileSelect?: (filePath: string) => void;
  onPlaylistSelect?: (files: string[]) => void;
  onPlaylistFileSelect?: (playlistPath: string) => void;
}

export default function MediaPlayerContainer({
  playlistPath,
  autoPlay = false,
  showFileExplorerOnly = false,
  onFileSelect,
  onPlaylistSelect,
  onPlaylistFileSelect,
}: MediaPlayerContainerProps) {
  const [currentTracks, setCurrentTracks] = useState<string[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [playerMode, setPlayerMode] = useState<"built-in" | "vlc">("built-in");
  const [mediaPlayerType, setMediaPlayerType] = useState<
    "auto" | "audio" | "video"
  >("auto");
  const [currentPlaylistName, setCurrentPlaylistName] = useState<string>("");
  const [shouldAutoPlay, setShouldAutoPlay] = useState(autoPlay);
  const { toast } = useToast();

  // Check if a file is a playlist file
  const isPlaylistFile = (filePath: string): boolean => {
    const ext = filePath.split(".").pop()?.toLowerCase();
    return ext === "m3u" || ext === "m3u8" || ext === "pls";
  };

  // Load playlist from M3U file
  const loadPlaylistFromFile = async (
    filePath: string,
    autoPlayFlag: boolean = false
  ) => {
    try {
      console.log("🎵 Loading playlist from file:", filePath);

      const playlistContent = await PlaylistService.loadPlaylistContent(
        filePath
      );

      if (playlistContent.tracks.length === 0) {
        toast({
          title: "Empty playlist",
          description: "The playlist file contains no valid tracks",
          variant: "destructive",
        });
        return;
      }

      setCurrentTracks(playlistContent.tracks);
      setCurrentTrackIndex(0);
      setCurrentPlaylistName(playlistContent.metadata.name);
      setShouldAutoPlay(autoPlayFlag);

      toast({
        title: "Playlist loaded",
        description: `Loaded "${playlistContent.metadata.name}" with ${playlistContent.tracks.length} tracks`,
      });

      if (playlistContent.metadata.invalidTracks > 0) {
        toast({
          title: "Some tracks unavailable",
          description: `${playlistContent.metadata.invalidTracks} tracks could not be found and were skipped`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading playlist:", error);
      toast({
        title: "Error loading playlist",
        description: "Failed to load the playlist file",
        variant: "destructive",
      });
    }
  };

  // Load single media file
  const loadSingleFile = (filePath: string, autoPlayFlag: boolean = false) => {
    console.log("🎵 Loading single media file:", filePath);

    setCurrentTracks([filePath]);
    setCurrentTrackIndex(0);
    setCurrentPlaylistName("");
    setShouldAutoPlay(autoPlayFlag);

    const fileName = filePath.split("/").pop() || filePath;
    toast({
      title: "Media file loaded",
      description: `Loaded: ${fileName}`,
    });
  };

  // Load media on mount if provided
  useEffect(() => {
    if (playlistPath) {
      if (isPlaylistFile(playlistPath)) {
        loadPlaylistFromFile(playlistPath, autoPlay);
      } else {
        loadSingleFile(playlistPath, autoPlay);
      }
    }
  }, [playlistPath, autoPlay]);

  // Listen for WebSocket commands
  useEffect(() => {
    const handleMediaPlayerCommand = (data: any) => {
      if (data.type === "mediaPlayerCommand") {
        console.log("🎵 Media player received command:", data.command);

        switch (data.command) {
          case "loadAndPlay":
            if (data.data?.playlistPath) {
              if (isPlaylistFile(data.data.playlistPath)) {
                loadPlaylistFromFile(data.data.playlistPath, true);
              } else {
                loadSingleFile(data.data.playlistPath, true);
              }
            }
            break;
          case "pause":
            // Trigger pause on current player
            setShouldAutoPlay(false);
            break;
          case "stop":
            // Stop playback and clear playlist
            setCurrentTracks([]);
            setCurrentTrackIndex(0);
            setCurrentPlaylistName("");
            setShouldAutoPlay(false);
            break;
        }
      }
    };

    WebSocketService.addListener(handleMediaPlayerCommand);
    return () => WebSocketService.removeListener(handleMediaPlayerCommand);
  }, []);

  const handleFileSelect = (filePath: string) => {
    if (onFileSelect) {
      onFileSelect(filePath);
    } else {
      if (isPlaylistFile(filePath)) {
        loadPlaylistFromFile(filePath, false);
      } else {
        loadSingleFile(filePath, false);
      }
    }
  };

  const handlePlaylistSelect = (files: string[]) => {
    if (onPlaylistSelect) {
      onPlaylistSelect(files);
    } else {
      setCurrentTracks(files);
      setCurrentTrackIndex(0);
      setCurrentPlaylistName("");
      setShouldAutoPlay(false);

      toast({
        title: "Playlist created",
        description: `Created playlist with ${files.length} tracks`,
      });
    }
  };

  const handlePlaylistFileSelect = async (playlistPath: string) => {
    if (onPlaylistFileSelect) {
      onPlaylistFileSelect(playlistPath);
    } else {
      await loadPlaylistFromFile(playlistPath, false);
    }
  };

  const handleTrackChange = (track: string, index: number) => {
    setCurrentTrackIndex(index);
  };

  // If only showing file explorer, return compact version
  if (showFileExplorerOnly) {
    return (
      <FileBrowser
        onFileSelect={handleFileSelect}
        onPlaylistSelect={handlePlaylistSelect}
        onPlaylistFileSelect={handlePlaylistFileSelect}
        mediaOnly={true}
        compact={true}
      />
    );
  }

  // Determine which player to use based on file type and user preference
  const getPlayerComponent = () => {
    if (currentTracks.length === 0) return null;

    const currentTrack = currentTracks[currentTrackIndex];
    const ext = currentTrack?.split(".").pop()?.toLowerCase() || "";

    // Video extensions that should use video player
    const videoExtensions = [
      "mp4",
      "webm",
      "ogg",
      "mov",
      "avi",
      "mkv",
      "wmv",
      "flv",
      "3gp",
      "m4v",
      "mpg",
      "mpeg",
      "ogv",
      "ts",
      "mts",
      "m2ts",
    ];

    // Audio extensions that should use audio player
    const audioExtensions = [
      "mp3",
      "wav",
      "flac",
      "aac",
      "m4a",
      "wma",
      "opus",
      "amr",
    ];

    const isVideo = videoExtensions.includes(ext);
    const isAudio = audioExtensions.includes(ext);

    // Auto-detect or use user preference
    if (
      mediaPlayerType === "video" ||
      (mediaPlayerType === "auto" && isVideo)
    ) {
      return (
        <VideoPlayer
          tracks={currentTracks}
          initialTrackIndex={currentTrackIndex}
          onTrackChange={handleTrackChange}
          autoPlay={shouldAutoPlay}
        />
      );
    } else if (
      mediaPlayerType === "audio" ||
      (mediaPlayerType === "auto" && isAudio)
    ) {
      return (
        <AudioPlayer
          tracks={currentTracks}
          initialTrackIndex={currentTrackIndex}
          onTrackChange={handleTrackChange}
          autoPlay={shouldAutoPlay}
        />
      );
    } else {
      // Default to video player for unknown formats
      return (
        <VideoPlayer
          tracks={currentTracks}
          initialTrackIndex={currentTrackIndex}
          onTrackChange={handleTrackChange}
          autoPlay={shouldAutoPlay}
        />
      );
    }
  };

  return (
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
                Supports: MP4, WebM, MOV, AVI, MP3, WAV, FLAC, AAC, M3U
                playlists and more
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Playlist */}
      {currentTracks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {currentTracks.length === 1
                  ? "Current Track"
                  : "Current Playlist"}
              </span>
              {currentPlaylistName && (
                <span className="text-sm text-muted-foreground">
                  {currentPlaylistName}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {currentTracks.map((track, index) => {
                const ext = track.split(".").pop()?.toLowerCase() || "";
                const videoExtensions = [
                  "mp4",
                  "webm",
                  "ogg",
                  "mov",
                  "avi",
                  "mkv",
                  "wmv",
                  "flv",
                  "3gp",
                  "m4v",
                ];
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
                        {track
                          .split("/")
                          .pop()
                          ?.replace(/\.[^/.]+$/, "") || "Unknown Track"}
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
  );
}
