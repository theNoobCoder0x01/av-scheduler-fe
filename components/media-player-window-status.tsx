"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { 
  Monitor,
  Square,
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  Window,
  X,
  Settings,
  FileMusic,
} from "lucide-react";

interface MediaPlayerWindowInfo {
  id: number;
  playlistPath?: string;
  isReady: boolean;
  createdAt: number;
  lastActivity: number;
}

interface MediaPlayerStatus {
  hasActiveWindow: boolean;
  activeWindowCount: number;
  windows: MediaPlayerWindowInfo[];
  allowMultiple: boolean;
  windowBehavior: 'close-existing' | 'skip-if-open';
}

export default function MediaPlayerWindowStatus() {
  const [status, setStatus] = useState<MediaPlayerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testPlaylistPath, setTestPlaylistPath] = useState('');
  const [autoPlay, setAutoPlay] = useState(true);
  const { toast } = useToast();

  const formatTimestamp = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  }, []);

  const formatDuration = useCallback((timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }, []);

  const loadStatus = useCallback(async () => {
    if (!window.electron?.getMediaPlayerStatus) {
      console.log('Enhanced media player APIs not available');
      return;
    }

    setLoading(true);
    try {
      const currentStatus = await window.electron.getMediaPlayerStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('Failed to load media player status:', error);
      toast({
        title: "Error",
        description: "Failed to load media player status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleOpenWindow = useCallback(async () => {
    if (!window.electron?.openMediaPlayerWindow) {
      toast({
        title: "Not available",
        description: "Enhanced media player APIs not available",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await window.electron.openMediaPlayerWindow(
        testPlaylistPath || undefined,
        autoPlay
      );

      if (result.success) {
        toast({
          title: "Window opened",
          description: result.message,
        });
      } else {
        toast({
          title: result.action === 'skipped' ? "Action skipped" : "Failed to open window",
          description: result.message,
          variant: result.action === 'skipped' ? "default" : "destructive",
        });
      }

      // Refresh status
      setTimeout(loadStatus, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open media player window",
        variant: "destructive",
      });
    }
  }, [testPlaylistPath, autoPlay, toast, loadStatus]);

  const handleCloseAllWindows = useCallback(async () => {
    if (!window.electron?.closeAllMediaPlayerWindows) {
      toast({
        title: "Not available",
        description: "Enhanced media player APIs not available",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await window.electron.closeAllMediaPlayerWindows();
      toast({
        title: "Windows closed",
        description: result.message,
      });

      // Refresh status
      setTimeout(loadStatus, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to close media player windows",
        variant: "destructive",
      });
    }
  }, [toast, loadStatus]);

  // Set up event listeners for window events
  useEffect(() => {
    if (!window.electron) return;

    const handleWindowOpened = (data: any) => {
      toast({
        title: "Media player window opened",
        description: `Window ${data.windowId} opened${data.playlistPath ? ` with playlist` : ''}`,
      });
      loadStatus();
    };

    const handleWindowClosed = (data: any) => {
      toast({
        title: "Media player window closed",
        description: `Window ${data.windowId} closed`,
      });
      loadStatus();
    };

    const handleActionExecuted = (data: any) => {
      toast({
        title: `Action executed: ${data.action}`,
        description: data.result.success ? data.result.message : `Failed: ${data.result.message}`,
        variant: data.result.success ? "default" : "destructive",
      });
      if (data.action === 'play' || data.action === 'stop') {
        loadStatus();
      }
    };

    const handleActionSkipped = (data: any) => {
      toast({
        title: `Action skipped: ${data.action}`,
        description: data.reason,
        variant: "default",
      });
    };

    // Set up listeners
    window.electron.onMediaPlayerWindowOpened?.(handleWindowOpened);
    window.electron.onMediaPlayerWindowClosed?.(handleWindowClosed);
    window.electron.onScheduledActionExecuted?.(handleActionExecuted);
    window.electron.onScheduledActionSkipped?.(handleActionSkipped);

    return () => {
      // Cleanup listeners
      window.electron?.removeAllListeners?.('mediaPlayerWindowOpened');
      window.electron?.removeAllListeners?.('mediaPlayerWindowClosed');
      window.electron?.removeAllListeners?.('scheduledActionExecuted');
      window.electron?.removeAllListeners?.('scheduledActionSkipped');
    };
  }, [toast, loadStatus]);

  // Auto-refresh status every 5 seconds
  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const getStatusColor = (windowInfo: MediaPlayerWindowInfo) => {
    const now = Date.now();
    const inactiveTime = now - windowInfo.lastActivity;
    
    if (!windowInfo.isReady) return 'text-yellow-500';
    if (inactiveTime > 5 * 60 * 1000) return 'text-red-500'; // 5 minutes
    if (inactiveTime > 2 * 60 * 1000) return 'text-orange-500'; // 2 minutes
    return 'text-green-500';
  };

  const getStatusText = (windowInfo: MediaPlayerWindowInfo) => {
    if (!windowInfo.isReady) return 'Loading...';
    
    const now = Date.now();
    const inactiveTime = now - windowInfo.lastActivity;
    
    if (inactiveTime > 5 * 60 * 1000) return 'Inactive';
    if (inactiveTime > 2 * 60 * 1000) return 'Idle';
    return 'Active';
  };

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Media Player Window Status
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadStatus}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {status && (
                <Badge variant={status.hasActiveWindow ? "default" : "secondary"}>
                  {status.activeWindowCount} active
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!window.electron?.getMediaPlayerStatus ? (
            <div className="text-center py-4 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>Enhanced media player APIs not available</p>
              <p className="text-sm">Make sure you're running in the Electron environment</p>
            </div>
          ) : status ? (
            <div className="space-y-4">
              {/* Overall Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {status.activeWindowCount}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Windows</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {status.allowMultiple ? '∞' : '1'}
                  </div>
                  <div className="text-sm text-muted-foreground">Max Allowed</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">
                    {status.windowBehavior === 'close-existing' ? 'Replace' : 'Skip'}
                  </div>
                  <div className="text-sm text-muted-foreground">Behavior</div>
                </div>
                <div className="text-center">
                  <div className={`text-sm font-medium ${status.hasActiveWindow ? 'text-green-600' : 'text-gray-500'}`}>
                    {status.hasActiveWindow ? 'Running' : 'Idle'}
                  </div>
                  <div className="text-sm text-muted-foreground">Status</div>
                </div>
              </div>

              {/* Active Windows */}
              {status.windows.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Active Windows</h4>
                  {status.windows.map((window) => (
                    <div
                      key={window.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${getStatusColor(window)}`} />
                        <div>
                          <div className="font-medium">Window {window.id}</div>
                          <div className="text-sm text-muted-foreground">
                            {window.playlistPath ? (
                              <div className="flex items-center gap-1">
                                <FileMusic className="h-3 w-3" />
                                {window.playlistPath.split('/').pop()}
                              </div>
                            ) : (
                              'No playlist loaded'
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className={getStatusColor(window)}>
                          {getStatusText(window)}
                        </div>
                        <div className="text-muted-foreground">
                          {formatDuration(window.lastActivity)} ago
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No Windows */}
              {status.windows.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Window className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No active media player windows</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto mb-2" />
              <p className="text-muted-foreground">Loading status...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Test Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Playlist Path Input */}
          <div className="space-y-2">
            <Label htmlFor="testPlaylist">Test Playlist Path (Optional)</Label>
            <Input
              id="testPlaylist"
              value={testPlaylistPath}
              onChange={(e) => setTestPlaylistPath(e.target.value)}
              placeholder="Enter playlist file path or leave empty"
            />
          </div>

          {/* Auto-play Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoPlay">Auto-play when opened</Label>
              <p className="text-sm text-muted-foreground">
                Automatically start playback when window opens
              </p>
            </div>
            <Switch
              id="autoPlay"
              checked={autoPlay}
              onCheckedChange={setAutoPlay}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleOpenWindow}
                    disabled={!window.electron?.openMediaPlayerWindow}
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Open Window
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Test opening a media player window with current settings
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleCloseAllWindows}
                    disabled={!window.electron?.closeAllMediaPlayerWindows || !status?.hasActiveWindow}
                    variant="destructive"
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Close All
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Close all active media player windows
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Information */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Activity className="h-4 w-4 mt-0.5 text-blue-600" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  Window Behavior Testing
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Use these controls to test how the media player window management works 
                  with your current settings. The behavior will depend on your configured 
                  window behavior setting (close existing vs skip if open).
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}