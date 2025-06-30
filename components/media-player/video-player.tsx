"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { MediaService } from "@/services/media.service";
import { PlayerService, PlayerState } from "@/services/player.service";
import { WebSocketService } from "@/services/web-socket.service";
import {
  Maximize,
  Minimize,
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

interface VideoPlayerProps {
  tracks: string[];
  initialTrackIndex?: number;
  onTrackChange?: (track: string, index: number) => void;
  autoPlay?: boolean;
}

export default function VideoPlayer({ 
  tracks, 
  initialTrackIndex = 0, 
  onTrackChange,
  autoPlay = false 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
  const [retryCount, setRetryCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [mediaType, setMediaType] = useState<'audio' | 'video'>('video');
  const [isHovering, setIsHovering] = useState(false);

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

  // Auto-play when autoPlay prop changes
  useEffect(() => {
    if (autoPlay && tracks.length > 0 && !playerState.isPlaying) {
      // Small delay to ensure track is loaded
      setTimeout(() => {
        play();
      }, 500);
    }
  }, [autoPlay, tracks]);

  // WebSocket listener for remote control
  useEffect(() => {
    const handlePlayerCommand = (data: any) => {
      if (data.type === "playerCommand") {
        handleRemoteCommand(data.command, data.data);
      } else if (data.type === "mediaPlayerCommand") {
        switch (data.command) {
          case "pause":
            pause();
            break;
          case "stop":
            stop();
            break;
        }
      }
    };

    WebSocketService.addListener(handlePlayerCommand);
    return () => WebSocketService.removeListener(handlePlayerCommand);
  }, []);

  // Auto-hide controls logic
  useEffect(() => {
    const hideControls = () => {
      if (controlsTimeout) clearTimeout(controlsTimeout);
      
      // Only hide if not hovering and playing
      if (!isHovering && playerState.isPlaying && mediaType === 'video') {
        const timeout = setTimeout(() => {
          setShowControls(false);
        }, 3000); // Hide after 3 seconds
        setControlsTimeout(timeout);
      }
    };

    const showControlsHandler = () => {
      setShowControls(true);
      hideControls();
    };

    if (mediaType === 'video') {
      // Show controls on mouse move
      const container = containerRef.current;
      if (container) {
        container.addEventListener('mousemove', showControlsHandler);
        container.addEventListener('mouseenter', () => {
          setIsHovering(true);
          setShowControls(true);
        });
        container.addEventListener('mouseleave', () => {
          setIsHovering(false);
          hideControls();
        });
        
        // Initial hide timer
        hideControls();

        return () => {
          container.removeEventListener('mousemove', showControlsHandler);
          container.removeEventListener('mouseenter', () => setIsHovering(true));
          container.removeEventListener('mouseleave', () => setIsHovering(false));
          if (controlsTimeout) clearTimeout(controlsTimeout);
        };
      }
    } else {
      // Always show controls for audio
      setShowControls(true);
      if (controlsTimeout) clearTimeout(controlsTimeout);
    }
  }, [isHovering, playerState.isPlaying, mediaType, controlsTimeout]);

  const detectMediaType = useCallback((filePath: string): 'audio' | 'video' => {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'wmv', 'flv', '3gp', 'm4v'];
    return videoExtensions.includes(ext) ? 'video' : 'audio';
  }, []);

  const loadTrack = useCallback(async (trackPath: string) => {
    if (!videoRef.current) return;

    setIsLoading(true);
    setLoadError(null);
    setRetryCount(0);
    
    try {
      console.log("🎵 Loading track:", trackPath);
      
      // Detect media type
      const detectedType = detectMediaType(trackPath);
      setMediaType(detectedType);
      
      // Validate media file first
      const isValid = await MediaService.validateMediaFile(trackPath);
      if (!isValid) {
        throw new Error("File is not a valid media file");
      }
      
      // Test if the stream URL is accessible
      const isAccessible = await MediaService.testStreamUrl(trackPath);
      if (!isAccessible) {
        throw new Error("Media file is not accessible for streaming");
      }
      
      const streamUrl = MediaService.getStreamUrl(trackPath);
      console.log("🔗 Stream URL:", streamUrl);
      
      // Reset video element
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      
      // Set new source with error handling
      videoRef.current.src = streamUrl;
      videoRef.current.load();
      
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
  }, [playerState.currentIndex, onTrackChange, toast, detectMediaType]);

  const retryLoadTrack = useCallback(() => {
    if (playerState.currentTrack && retryCount < 3) {
      setRetryCount(prev => prev + 1);
      console.log(`🔄 Retrying track load (attempt ${retryCount + 1})`);
      loadTrack(playerState.currentTrack);
    }
  }, [playerState.currentTrack, retryCount, loadTrack]);

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
    if (!videoRef.current) return;
    
    try {
      await videoRef.current.play();
      const newState = { ...playerState, isPlaying: true };
      setPlayerState(newState);
      PlayerService.updateState(newState);
      setLoadError(null);
    } catch (error) {
      console.error("❌ Error playing media:", error);
      setLoadError("Failed to play media");
      toast({
        title: "Playback error",
        description: "Failed to play media. The file may be corrupted or unsupported.",
        variant: "destructive",
      });
    }
  }, [playerState, toast]);

  const pause = useCallback(() => {
    if (!videoRef.current) return;
    
    videoRef.current.pause();
    const newState = { ...playerState, isPlaying: false };
    setPlayerState(newState);
    PlayerService.updateState(newState);
  }, [playerState]);

  const stop = useCallback(() => {
    if (!videoRef.current) return;
    
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    const newState = { ...playerState, isPlaying: false, currentTime: 0 };
    setPlayerState(newState);
    PlayerService.updateState(newState);
  }, [playerState]);

  const seek = useCallback((time: number) => {
    if (!videoRef.current || !isFinite(time)) return;
    
    const clampedTime = Math.max(0, Math.min(time, playerState.duration));
    videoRef.current.currentTime = clampedTime;
    setPlayerState(prev => ({ ...prev, currentTime: clampedTime }));
  }, [playerState.duration]);

  const setVolume = useCallback((volume: number) => {
    if (!videoRef.current) return;
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    videoRef.current.volume = clampedVolume;
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

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    
    const currentTime = videoRef.current.currentTime;
    if (isFinite(currentTime)) {
      setPlayerState(prev => ({ ...prev, currentTime }));
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    
    const duration = videoRef.current.duration;
    if (isFinite(duration)) {
      setPlayerState(prev => ({ ...prev, duration }));
      console.log("✅ Track loaded successfully, duration:", duration);
    }
  }, []);

  const handleCanPlay = useCallback(() => {
    console.log("✅ Track can play");
    setLoadError(null);
    setRetryCount(0);
  }, []);

  const handleError = useCallback((e: any) => {
    console.error("❌ Video error:", e);
    const error = videoRef.current?.error;
    let errorMessage = "Unknown playback error";
    
    if (error) {
      switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
          errorMessage = "Playback was aborted";
          break;
        case error.MEDIA_ERR_NETWORK:
          errorMessage = "Network error while loading media";
          break;
        case error.MEDIA_ERR_DECODE:
          errorMessage = "Media decode error - file may be corrupted";
          break;
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = "Media format not supported by browser";
          break;
      }
    }
    
    setLoadError(errorMessage);
    
    if (error?.code !== error?.MEDIA_ERR_NETWORK || playerState.isPlaying) {
      toast({
        title: "Playback error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast, playerState.isPlaying]);

  const handleEnded = useCallback(() => {
    if (playerState.repeat === 'one') {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    } else if (playerState.repeat === 'all' || playerState.currentIndex < tracks.length - 1) {
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
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [playerState, tracks, nextTrack, loadTrack]);

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [handleFullscreenChange]);

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
      <CardContent className="p-0 relative">
        <div 
          ref={containerRef}
          className={`relative group @container ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}
          style={{ containerType: 'inline-size' }}
        >
          <video
            ref={videoRef}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={handleCanPlay}
            onError={handleError}
            onEnded={handleEnded}
            preload="metadata"
            crossOrigin="anonymous"
            className={`w-full ${mediaType === 'video' ? 'aspect-video' : 'h-16'} bg-black cursor-pointer`}
            style={{ display: mediaType === 'audio' ? 'none' : 'block' }}
            controls={false}
            onClick={() => playerState.isPlaying ? pause() : play()}
          />
          
          {/* Audio visualization for audio files */}
          {mediaType === 'audio' && (
            <div className="w-full h-32 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="text-white text-center z-10">
                <div className="text-lg font-semibold mb-2">🎵 Audio Playing</div>
                <div className="text-sm opacity-75">{currentTrackName}</div>
                {autoPlay && (
                  <div className="text-xs opacity-75 mt-1">▶️ Auto-playing from scheduler</div>
                )}
              </div>
              {/* Animated bars for audio visualization */}
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center space-x-1 h-8 opacity-30">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white w-1 animate-pulse"
                    style={{
                      height: `${Math.random() * 100}%`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: `${0.5 + Math.random() * 0.5}s`
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Responsive Controls Overlay */}
          <div className={`absolute inset-0 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            
            {/* Top Info Bar (only in fullscreen or large containers) */}
            {(isFullscreen || true) && (
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-2 @lg:p-4">
                <div className="flex items-center justify-between text-white">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate text-sm @lg:text-base">{currentTrackName}</h3>
                    <p className="text-xs @lg:text-sm opacity-75">
                      Track {playerState.currentIndex + 1} of {tracks.length}
                      {autoPlay && " • Auto-playing from scheduler"}
                    </p>
                  </div>
                  {isFullscreen && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFullscreen}
                      className="text-white hover:bg-white/20 h-8 w-8 @lg:h-10 @lg:w-10 ml-2"
                    >
                      <Minimize className="h-4 w-4 @lg:h-5 @lg:w-5" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Center Play/Pause Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                size="icon"
                onClick={playerState.isPlaying ? pause : play}
                disabled={isLoading || (loadError !== null && retryCount >= 3)}
                className="bg-black/50 hover:bg-black/70 text-white border-white/20 rounded-full backdrop-blur-sm h-12 w-12 @md:h-16 @md:w-16"
                style={{ 
                  opacity: playerState.isPlaying ? 0 : 1,
                  transition: 'opacity 0.3s ease'
                }}
              >
                {isLoading ? (
                  <div className="h-5 w-5 @md:h-6 @md:w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Play className="h-5 w-5 @md:h-6 @md:w-6" />
                )}
              </Button>
            </div>

            {/* Bottom Controls - Responsive Layout */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              
              {/* Progress Bar */}
              <div className="px-2 @md:px-4 pt-2 @md:pt-4 pb-1 @md:pb-2">
                <div className="flex items-center space-x-1 @md:space-x-2 text-white text-xs">
                  <span className="min-w-[30px] @md:min-w-[35px] text-xs">{formatTime(playerState.currentTime)}</span>
                  <Slider
                    value={[playerState.currentTime]}
                    max={playerState.duration || 100}
                    step={1}
                    onValueChange={([value]) => seek(value)}
                    className="flex-1"
                    disabled={!playerState.duration || loadError !== null}
                  />
                  <span className="min-w-[30px] @md:min-w-[35px] text-xs">{formatTime(playerState.duration)}</span>
                </div>
              </div>

              {/* Control Buttons - Responsive Layout */}
              <div className="px-2 @md:px-4 pb-2 @md:pb-4">
                
                {/* Small Container Layout (< 400px) */}
                <div className="@container-normal:hidden">
                  {/* Compact single row for very small containers */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={previousTrack}
                        disabled={playerState.currentIndex === 0}
                        className="text-white hover:bg-white/20 h-7 w-7"
                      >
                        <SkipBack className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={playerState.isPlaying ? pause : play}
                        disabled={isLoading || (loadError !== null && retryCount >= 3)}
                        className="text-white hover:bg-white/20 h-7 w-7"
                      >
                        {isLoading ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : playerState.isPlaying ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={nextTrack}
                        disabled={playerState.currentIndex === tracks.length - 1}
                        className="text-white hover:bg-white/20 h-7 w-7"
                      >
                        <SkipForward className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={toggleMute}
                        className="text-white hover:bg-white/20 h-7 w-7"
                      >
                        {isMuted || playerState.volume === 0 ? (
                          <VolumeX className="h-3 w-3" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                      </Button>
                      
                      {mediaType === 'video' && !isFullscreen && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleFullscreen}
                          className="text-white hover:bg-white/20 h-7 w-7"
                        >
                          <Maximize className="h-2 w-2" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Medium+ Container Layout (>= 400px) */}
                <div className="hidden @container-normal:block">
                  <div className="flex items-center justify-between">
                    
                    {/* Left Controls */}
                    <div className="flex items-center space-x-1 @lg:space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={previousTrack}
                        disabled={playerState.currentIndex === 0}
                        className="text-white hover:bg-white/20 h-8 w-8"
                      >
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={playerState.isPlaying ? pause : play}
                        disabled={isLoading || (loadError !== null && retryCount >= 3)}
                        className="text-white hover:bg-white/20 h-8 w-8"
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
                        className="text-white hover:bg-white/20 h-8 w-8"
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Center Info (hidden on small, shown on medium+) */}
                    <div className="hidden @lg:block text-center text-white flex-1 mx-4">
                      <div className="text-sm font-medium truncate">{currentTrackName}</div>
                      <div className="text-xs opacity-75">
                        {playerState.currentIndex + 1} / {tracks.length}
                        {autoPlay && " • Auto-playing"}
                      </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center space-x-1 @lg:space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleShuffle}
                        className={`text-white hover:bg-white/20 h-8 w-8 ${playerState.shuffle ? "text-blue-400" : ""}`}
                      >
                        <Shuffle className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleRepeat}
                        className={`text-white hover:bg-white/20 h-8 w-8 ${playerState.repeat !== 'none' ? "text-blue-400" : ""}`}
                      >
                        {playerState.repeat === 'one' ? (
                          <Repeat1 className="h-3 w-3" />
                        ) : (
                          <Repeat className="h-3 w-3" />
                        )}
                      </Button>

                      {/* Volume Control */}
                      <div className="flex items-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={toggleMute}
                          className="text-white hover:bg-white/20 h-8 w-8"
                        >
                          {isMuted || playerState.volume === 0 ? (
                            <VolumeX className="h-3 w-3" />
                          ) : (
                            <Volume2 className="h-3 w-3" />
                          )}
                        </Button>
                        <div className="w-12 @lg:w-16">
                          <Slider
                            value={[playerState.volume]}
                            max={1}
                            step={0.01}
                            onValueChange={([value]) => setVolume(value)}
                            className="w-full"
                          />
                        </div>
                      </div>

                      {mediaType === 'video' && !isFullscreen && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleFullscreen}
                          className="text-white hover:bg-white/20 h-8 w-8"
                        >
                          <Maximize className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="bg-red-900/90 text-white p-4 rounded-lg max-w-md text-center mx-4">
                <p className="text-sm mb-2">⚠️ {loadError}</p>
                {retryCount < 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryLoadTrack}
                    className="text-white border-white hover:bg-white/20"
                  >
                    Retry ({retryCount}/3)
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* External Controls for Small Video Players */}
        {mediaType === 'video' && !isFullscreen && (
          <div className="@container-normal:hidden p-4 bg-muted/50">
            <div className="space-y-3">
              {/* Track Info */}
              <div className="text-center">
                <div className="font-medium text-sm truncate">{currentTrackName}</div>
                <div className="text-xs text-muted-foreground">
                  Track {playerState.currentIndex + 1} of {tracks.length}
                  {autoPlay && " • Auto-playing from scheduler"}
                </div>
              </div>
              
              {/* Extended Controls */}
              <div className="flex items-center justify-center space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleShuffle}
                  className={playerState.shuffle ? "text-blue-500" : ""}
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleRepeat}
                  className={playerState.repeat !== 'none' ? "text-blue-500" : ""}
                >
                  {playerState.repeat === 'one' ? (
                    <Repeat1 className="h-4 w-4" />
                  ) : (
                    <Repeat className="h-4 w-4" />
                  )}
                </Button>

                {/* Volume Control */}
                <div className="flex items-center space-x-2 flex-1 max-w-32">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleMute}
                  >
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

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info (development only) */}
        {process.env.NODE_ENV === 'development' && !isFullscreen && (
          <div className="mt-4 p-2 bg-muted rounded text-xs">
            <p><strong>Media Type:</strong> {mediaType}</p>
            <p><strong>Show Controls:</strong> {showControls ? 'Yes' : 'No'}</p>
            <p><strong>Container Width:</strong> Use browser dev tools to see @container queries</p>
            <p><strong>Fullscreen:</strong> {isFullscreen ? 'Yes' : 'No'}</p>
            <p><strong>Auto Play:</strong> {autoPlay ? 'Yes' : 'No'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}