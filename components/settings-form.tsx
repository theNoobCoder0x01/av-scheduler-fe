"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppSettings } from "@/models/settings.model";
import { SettingsService } from "@/services/settings.service";
import { FolderOpen } from "lucide-react";
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
          <div className="space-y-4">
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
                <Button variant="outline" size="icon" onClick={handleFolderSelect}>
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button onClick={handleSave}>Save Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
