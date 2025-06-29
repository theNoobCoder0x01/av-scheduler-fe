"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { MediaService } from "@/services/media.service";
import { PlayerService, PlayerState } from "@/services/player.service";
import { WebSocketService } from "@/services/web-socket.service";
import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
  tracks: string[];
  initialTrackIndex?: number;
  onTrackChange?: (track: string, index: number) => void;
}

export default function AudioPlayer({ tracks, initialTrackIndex = 0, onTrackChange }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    currentTrack: null,
    playlist: tracks,
    currentIndex: initialTrackIndex,
    repeat: 'none',
    shuffle: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Initialize player
  useEffect(() => {
    if (tracks.length > 0) {
      const initialTrack = tracks[initialTrackIndex];
      setPlayerState(prev => ({
        ...prev,
        playlist: tracks,
        currentIndex: initialTrackIndex,
        currentTrack: initialTrack
      }));
      loadTrack(initialTrack);
    }
  }, [tracks, initialTrackIndex]);

  // WebSocket listener for remote control
  useEffect(() => {
    const handlePlayerCommand = (data: any) => {
      if (data.type === "playerCommand") {
        handleRemoteCommand(data.command, data.data);
      }
    };

    WebSocketService.addListener(handlePlayerCommand);
    return () => WebSocketService.removeListener(handlePlayerCommand);
  }, []);

  const loadTrack = useCallback(async (trackPath: string) => {
    if (!audioRef.current) return;

    setIsLoading(true);
    setLoadError(null);
    
    try {
      console.log("🎵 Loading track:", trackPath);
      
      // Test if the stream URL is accessible
      const isAccessible = await MediaService.testStreamUrl(trackPath);
      if (!isAccessible) {
        throw new Error("Media file is not accessible or supported");
      }
      
      const streamUrl = MediaService.getStreamUrl(trackPath);
      console.log("🔗 Stream URL:", streamUrl);
      
      // Reset audio element
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Set new source
      audioRef.current.src = streamUrl;
      audioRef.current.load();
      
      onTrackChange?.(trackPath, playerState.currentIndex);
      
      toast({
        title: "Track loaded",
        description: `Loading: ${trackPath.split('/').pop()}`,
      });
    } catch (error) {
      console.error("❌ Error loading track:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load track";
      setLoadError(errorMessage);
      toast({
        title: "Error loading track",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [playerState.currentIndex, onTrackChange, toast]);

  const handleRemoteCommand = useCallback((command: string, data?: any) => {
    switch (command) {
      case "play":
        play();
        break;
      case "pause":
        pause();
        break;
      case "stop":
        stop();
        break;
      case "next":
        nextTrack();
        break;
      case "previous":
        previousTrack();
        break;
      case "seek":
        if (data?.time !== undefined) {
          seek(data.time);
        }
        break;
      case "volume":
        if (data?.volume !== undefined) {
          setVolume(data.volume);
        }
        break;
    }
  }, []);

  const play = useCallback(async () => {
    if (!audioRef.current) return;
    
    try {
      await audioRef.current.play();
      const newState = { ...playerState, isPlaying: true };
      setPlayerState(newState);
      PlayerService.updateState(newState);
    } catch (error) {
      console.error("❌ Error playing audio:", error);
      toast({
        title: "Playback error",
        description: "Failed to play audio. Check if the file is accessible.",
        variant: "destructive",
      });
    }
  }, [playerState, toast]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    const newState = { ...playerState, isPlaying: false };
    setPlayerState(newState);
    PlayerService.updateState(newState);
  }, [playerState]);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    const newState = { ...playerState, isPlaying: false, currentTime: 0 };
    setPlayerState(newState);
    PlayerService.updateState(newState);
  }, [playerState]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = time;
    setPlayerState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (!audioRef.current) return;
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    audioRef.current.volume = clampedVolume;
    setPlayerState(prev => ({ ...prev, volume: clampedVolume }));
    setIsMuted(clampedVolume === 0);
  }, []);

  const nextTrack = useCallback(() => {
    const nextIndex = playerState.currentIndex + 1;
    if (nextIndex < tracks.length) {
      const nextTrack = tracks[nextIndex];
      const newState = {
        ...playerState,
        currentIndex: nextIndex,
        currentTrack: nextTrack,
        currentTime: 0
      };
      setPlayerState(newState);
      loadTrack(nextTrack);
      PlayerService.updateState(newState);
    }
  }, [playerState, tracks, loadTrack]);

  const previousTrack = useCallback(() => {
    const prevIndex = playerState.currentIndex - 1;
    if (prevIndex >= 0) {
      const prevTrack = tracks[prevIndex];
      const newState = {
        ...playerState,
        currentIndex: prevIndex,
        currentTrack: prevTrack,
        currentTime: 0
      };
      setPlayerState(newState);
      loadTrack(prevTrack);
      PlayerService.updateState(newState);
    }
  }, [playerState, tracks, loadTrack]);

  const toggleRepeat = useCallback(() => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(playerState.repeat);
    const newRepeat = modes[(currentIndex + 1) % modes.length];
    setPlayerState(prev => ({ ...prev, repeat: newRepeat }));
  }, [playerState.repeat]);

  const toggleShuffle = useCallback(() => {
    setPlayerState(prev => ({ ...prev, shuffle: !prev.shuffle }));
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(0.5);
    } else {
      setVolume(0);
    }
  }, [isMuted, setVolume]);

  // Audio event handlers
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    
    const currentTime = audioRef.current.currentTime;
    setPlayerState(prev => ({ ...prev, currentTime }));
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return;
    
    const duration = audioRef.current.duration;
    setPlayerState(prev => ({ ...prev, duration }));
    console.log("✅ Track loaded successfully, duration:", duration);
  }, []);

  const handleCanPlay = useCallback(() => {
    console.log("✅ Track can play");
    setLoadError(null);
  }, []);

  const handleError = useCallback((e: any) => {
    console.error("❌ Audio error:", e);
    const error = audioRef.current?.error;
    let errorMessage = "Unknown playback error";
    
    if (error) {
      switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
          errorMessage = "Playback aborted";
          break;
        case error.MEDIA_ERR_NETWORK:
          errorMessage = "Network error while loading media";
          break;
        case error.MEDIA_ERR_DECODE:
          errorMessage = "Media decode error";
          break;
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = "Media format not supported";
          break;
      }
    }
    
    setLoadError(errorMessage);
    toast({
      title: "Playback error",
      description: errorMessage,
      variant: "destructive",
    });
  }, [toast]);

  const handleEnded = useCallback(() => {
    if (playerState.repeat === 'one') {
      // Repeat current track
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (playerState.repeat === 'all' || playerState.currentIndex < tracks.length - 1) {
      // Go to next track or loop back to first
      const nextIndex = playerState.currentIndex + 1;
      if (nextIndex < tracks.length) {
        nextTrack();
      } else if (playerState.repeat === 'all') {
        const firstTrack = tracks[0];
        const newState = {
          ...playerState,
          currentIndex: 0,
          currentTrack: firstTrack,
          currentTime: 0
        };
        setPlayerState(newState);
        loadTrack(firstTrack);
        PlayerService.updateState(newState);
      }
    } else {
      // Stop playing
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [playerState, tracks, nextTrack, loadTrack]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTrackName = playerState.currentTrack 
    ? playerState.currentTrack.split('/').pop()?.replace(/\.[^/.]+$/, "") || "Unknown Track"
    : "No Track";

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onError={handleError}
          onEnded={handleEnded}
          preload="metadata"
          crossOrigin="anonymous"
        />
        
        {/* Track Info */}
        <div className="text-center mb-4">
          <h3 className="font-semibold text-lg truncate">{currentTrackName}</h3>
          <p className="text-sm text-muted-foreground">
            Track {playerState.currentIndex + 1} of {tracks.length}
          </p>
          {loadError && (
            <p className="text-sm text-red-500 mt-1">⚠️ {loadError}</p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <Slider
            value={[playerState.currentTime]}
            max={playerState.duration || 100}
            step={1}
            onValueChange={([value]) => seek(value)}
            className="w-full"
            disabled={!playerState.duration || loadError !== null}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatTime(playerState.currentTime)}</span>
            <span>{formatTime(playerState.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleShuffle}
            className={playerState.shuffle ? "text-primary" : ""}
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={previousTrack}
            disabled={playerState.currentIndex === 0}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            size="icon"
            onClick={playerState.isPlaying ? pause : play}
            disabled={isLoading || loadError !== null}
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : playerState.isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={nextTrack}
            disabled={playerState.currentIndex === tracks.length - 1}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRepeat}
            className={playerState.repeat !== 'none' ? "text-primary" : ""}
          >
            {playerState.repeat === 'one' ? (
              <Repeat1 className="h-4 w-4" />
            ) : (
              <Repeat className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={toggleMute}>
            {isMuted || playerState.volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[playerState.volume]}
            max={1}
            step={0.01}
            onValueChange={([value]) => setVolume(value)}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-8">
            {Math.round(playerState.volume * 100)}%
          </span>
        </div>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-muted rounded text-xs">
            <p>Current Track: {playerState.currentTrack}</p>
            <p>Stream URL: {playerState.currentTrack ? MediaService.getStreamUrl(playerState.currentTrack) : 'None'}</p>
            <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
            <p>Error: {loadError || 'None'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}