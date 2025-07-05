"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AppSettings } from "@/models/settings.model";
import { SettingsService } from "@/services/settings.service";
import { FolderOpen, Monitor, Music } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function SettingsForm() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadSettings = useCallback(async () => {
    try {
      const data = await SettingsService.getSettings();
      setSettings(data);
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

  const handleSave = async () => {
    if (!settings) return;

    try {
      await SettingsService.updateSettings(settings);
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const handleFolderSelect = async () => {
    if (typeof window !== "undefined" && window.electron?.openFolderDialog) {
      const selectedPath = await window.electron.openFolderDialog();
      if (selectedPath) {
        setSettings((prev) => ({
          ...prev!,
          playlistFolderPath: selectedPath,
        }));
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Playlist Folder Path */}
            <div className="space-y-2">
              <Label htmlFor="playlistFolder">Playlist Folder Path</Label>
              <div className="flex gap-2">
                <Input
                  id="playlistFolder"
                  value={settings?.playlistFolderPath || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev!,
                      playlistFolderPath: e.target.value,
                    }))
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

            {/* Player Mode Selection */}
            <div className="space-y-2">
              <Label htmlFor="playerMode">Default Media Player</Label>
              <Select
                value={settings?.playerMode || "vlc"}
                onValueChange={(value: "vlc" | "built-in") =>
                  setSettings((prev) => ({
                    ...prev!,
                    playerMode: value,
                  }))
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
                Choose which player to use for scheduled actions and media
                playback
              </p>
            </div>

            <Button onClick={handleSave}>Save Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
