"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AppSettings } from "@/models/settings.model";
import { SettingsService } from "@/services/settings.service";
import { 
  FolderOpen, 
  Monitor, 
  Music, 
  Settings,
  AlertTriangle,
  Info,
  CheckCircle,
  Window,
  Clock,
  Eye,
  Square,
  SkipForward,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function SettingsForm() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();

  const loadSettings = useCallback(async () => {
    try {
      const data = await SettingsService.getSettings();
      setSettings(data);
      setHasUnsavedChanges(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Track changes to show unsaved indicator
  const updateSetting = useCallback((key: keyof AppSettings, value: any) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [key]: value };
      setHasUnsavedChanges(true);
      return updated;
    });
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await SettingsService.updateSettings(settings);
      setHasUnsavedChanges(false);
      
      // Notify Electron main process about settings update
      if (typeof window !== "undefined" && window.electron?.notifySettingsUpdate) {
        window.electron.notifySettingsUpdate();
      }

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFolderSelect = async () => {
    if (typeof window !== "undefined" && window.electron?.openFolderDialog) {
      const selectedPath = await window.electron.openFolderDialog();
      if (selectedPath) {
        updateSetting("playlistFolderPath", selectedPath);
      }
    }
  };

  const resetToDefaults = () => {
    if (!settings) return;
    
    const defaultSettings: AppSettings = {
      playlistFolderPath: settings.playlistFolderPath, // Keep current path
      playerMode: "vlc",
      mediaPlayerWindowBehavior: "close-existing",
      allowMultipleMediaWindows: false,
      mediaPlayerWindowTimeout: 5,
      mediaPlayerAutoFocus: true,
    };
    
    setSettings(defaultSettings);
    setHasUnsavedChanges(true);
    
    toast({
      title: "Settings reset",
      description: "Settings have been reset to defaults (not saved yet)",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Loading settings...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Application Settings</h1>
          <p className="text-muted-foreground">
            Configure your media player and scheduling preferences
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="animate-pulse">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unsaved changes
            </Badge>
          )}
          <Button 
            onClick={resetToDefaults}
            variant="outline"
            size="sm"
          >
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Media Player Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Media Player Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Player Mode Selection */}
          <div className="space-y-2">
            <Label htmlFor="playerMode">Default Media Player</Label>
            <Select
              value={settings?.playerMode || "vlc"}
              onValueChange={(value: "vlc" | "built-in") =>
                updateSetting("playerMode", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select media player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vlc">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <div>
                      <div className="font-medium">VLC Player</div>
                      <div className="text-xs text-muted-foreground">
                        Use external VLC application
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="built-in">
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Built-in Player</div>
                      <div className="text-xs text-muted-foreground">
                        Use integrated web-based player
                      </div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose which player to use for scheduled actions and media playback
            </p>
          </div>

          <Separator />

          {/* Window Behavior Settings - Only show for built-in player */}
          {settings?.playerMode === "built-in" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Window className="h-4 w-4" />
                <Label className="text-base font-medium">Window Behavior</Label>
              </div>
              
              {/* Primary Window Behavior Setting */}
              <div className="space-y-2">
                <Label htmlFor="windowBehavior">
                  When a scheduled action triggers and a media player window is already open:
                </Label>
                <Select
                  value={settings?.mediaPlayerWindowBehavior || "close-existing"}
                  onValueChange={(value: "close-existing" | "skip-if-open") =>
                    updateSetting("mediaPlayerWindowBehavior", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select behavior" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="close-existing">
                      <div className="flex items-center gap-2">
                        <Square className="h-4 w-4 text-orange-500" />
                        <div>
                          <div className="font-medium">Close existing and open new</div>
                          <div className="text-xs text-muted-foreground">
                            Automatically close the existing window and open a new one
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="skip-if-open">
                      <div className="flex items-center gap-2">
                        <SkipForward className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="font-medium">Skip action if window open</div>
                          <div className="text-xs text-muted-foreground">
                            Skip the scheduled action and keep the existing window
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Behavior explanation */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 text-blue-500" />
                    <div className="text-sm">
                      {settings?.mediaPlayerWindowBehavior === "close-existing" ? (
                        <div>
                          <p className="font-medium text-orange-600">Close & Replace Behavior</p>
                          <p className="text-muted-foreground">
                            When a scheduled action (like play/pause) is triggered, any existing media player 
                            window will be automatically closed, and a new window will open with the scheduled content. 
                            This ensures the scheduled action always executes.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-blue-600">Skip if Open Behavior</p>
                          <p className="text-muted-foreground">
                            When a scheduled action is triggered, it will be skipped if a media player window 
                            is already open. This prevents interrupting active playback but may cause 
                            scheduled actions to be missed.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Multiple Windows Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="allowMultiple">Allow Multiple Media Player Windows</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow multiple media player windows to be open simultaneously
                    </p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Switch
                            id="allowMultiple"
                            checked={settings?.allowMultipleMediaWindows || false}
                            onCheckedChange={(checked) => 
                              updateSetting("allowMultipleMediaWindows", checked)
                            }
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {settings?.allowMultipleMediaWindows 
                            ? "Multiple windows allowed - may cause conflicts"
                            : "Only one window at a time - recommended for scheduled actions"
                          }
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {settings?.allowMultipleMediaWindows && (
                  <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-600" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">
                          Multiple Windows Warning
                        </p>
                        <p className="text-yellow-700 dark:text-yellow-300">
                          Allowing multiple windows may cause conflicts with scheduled actions 
                          (play/pause commands may not target the intended window).
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Auto Focus Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="autoFocus">Auto-focus Media Player Window</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically bring the media player window to front when opened
                    </p>
                  </div>
                  <Switch
                    id="autoFocus"
                    checked={settings?.mediaPlayerAutoFocus !== false}
                    onCheckedChange={(checked) => 
                      updateSetting("mediaPlayerAutoFocus", checked)
                    }
                  />
                </div>
              </div>

              {/* Window Timeout Setting */}
              <div className="space-y-2">
                <Label htmlFor="windowTimeout">Window Operation Timeout</Label>
                <div className="flex items-center space-x-2">
                  <Select
                    value={settings?.mediaPlayerWindowTimeout?.toString() || "5"}
                    onValueChange={(value) => 
                      updateSetting("mediaPlayerWindowTimeout", parseInt(value))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 seconds</SelectItem>
                      <SelectItem value="5">5 seconds</SelectItem>
                      <SelectItem value="10">10 seconds</SelectItem>
                      <SelectItem value="15">15 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Timeout for window operations
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Maximum time to wait for window operations to complete before timing out
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            File System Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="playlistFolder">Playlist Folder Path</Label>
            <div className="flex gap-2">
              <Input
                id="playlistFolder"
                value={settings?.playlistFolderPath || ""}
                onChange={(e) =>
                  updateSetting("playlistFolderPath", e.target.value)
                }
                placeholder="Enter playlist folder path"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleFolderSelect}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Default location where playlists will be saved and loaded from
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {hasUnsavedChanges ? (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              You have unsaved changes
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              All changes saved
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={loadSettings}
            disabled={loading || saving}
          >
            Cancel Changes
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saving}
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
