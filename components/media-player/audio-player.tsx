"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
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
    try {
      const streamUrl = MediaService.getStreamUrl(trackPath);
      audioRef.current.src = streamUrl;
      audioRef.current.load();
      
      onTrackChange?.(trackPath, playerState.currentIndex);
    } catch (error) {
      console.error("Error loading track:", error);
    } finally {
      setIsLoading(false);
    }
  }, [playerState.currentIndex, onTrackChange]);

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
      console.error("Error playing audio:", error);
    }
  }, [playerState]);

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
  }, []);

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
          onEnded={handleEnded}
          preload="metadata"
        />
        
        {/* Track Info */}
        <div className="text-center mb-4">
          <h3 className="font-semibold text-lg truncate">{currentTrackName}</h3>
          <p className="text-sm text-muted-foreground">
            Track {playerState.currentIndex + 1} of {tracks.length}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <Slider
            value={[playerState.currentTime]}
            max={playerState.duration || 100}
            step={1}
            onValueChange={([value]) => seek(value)}
            className="w-full"
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
            disabled={isLoading}
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
      </CardContent>
    </Card>
  );
}