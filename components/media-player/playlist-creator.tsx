"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ICalendarEvent } from "@/models/calendar-event.model";
import { PlaylistService } from "@/services/playlist.service";
import { SettingsService } from "@/services/settings.service";
import {
  Check,
  Download,
  FileMusic,
  FolderOpen,
  Music,
  Save,
  Server,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import FileBrowser from "./file-browser";

interface PlaylistCreatorProps {
  events: ICalendarEvent[];
  onPlaylistCreated?: (playlistPath: string) => void;
}

interface PlaylistTrack {
  path: string;
  name: string;
  duration?: number;
}

export default function PlaylistCreator({
  events,
  onPlaylistCreated,
}: PlaylistCreatorProps) {
  const [selectedTracks, setSelectedTracks] = useState<PlaylistTrack[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<string>("none");
  const [saveLocation, setSaveLocation] = useState<string>("");
  const [defaultPlaylistPath, setDefaultPlaylistPath] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveMethod, setSaveMethod] = useState<"download" | "server">("server");
  const { toast } = useToast();

  // Load default playlist path from settings
  const loadSettings = useCallback(async () => {
    try {
      const settings = await SettingsService.getSettings();
      setDefaultPlaylistPath(settings.playlistFolderPath);
      setSaveLocation(settings.playlistFolderPath);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Auto-generate playlist name when event is selected
  useEffect(() => {
    if (selectedEvent && selectedEvent !== "none") {
      const event = events.find((e) => e.uid === selectedEvent);
      if (event) {
        // Clean the event name for file system compatibility
        const cleanName = event.summary.replace(/[<>:"/\\|?*]/g, "_");
        setPlaylistName(cleanName);
      }
    }
  }, [selectedEvent, events]);

  const handleFileSelect = (filePath: string) => {
    const fileName = filePath.split("/").pop() || filePath;
    const newTrack: PlaylistTrack = {
      path: filePath,
      name: fileName,
    };

    // Check if track already exists
    if (!selectedTracks.some((track) => track.path === filePath)) {
      setSelectedTracks((prev) => [...prev, newTrack]);
      toast({
        title: "Track added",
        description: `Added "${fileName}" to playlist`,
      });
    } else {
      toast({
        title: "Track already added",
        description: `"${fileName}" is already in the playlist`,
        variant: "destructive",
      });
    }
  };

  const handlePlaylistSelect = (files: string[]) => {
    const newTracks: PlaylistTrack[] = files.map((filePath) => ({
      path: filePath,
      name: filePath.split("/").pop() || filePath,
    }));

    // Filter out duplicates
    const uniqueTracks = newTracks.filter(
      (newTrack) =>
        !selectedTracks.some(
          (existingTrack) => existingTrack.path === newTrack.path,
        ),
    );

    if (uniqueTracks.length > 0) {
      setSelectedTracks((prev) => [...prev, ...uniqueTracks]);
      toast({
        title: "Tracks added",
        description: `Added ${uniqueTracks.length} tracks to playlist`,
      });
    } else {
      toast({
        title: "No new tracks",
        description: "All selected tracks are already in the playlist",
        variant: "destructive",
      });
    }
  };

  const removeTrack = (index: number) => {
    const removedTrack = selectedTracks[index];
    setSelectedTracks((prev) => prev.filter((_, i) => i !== index));
    toast({
      title: "Track removed",
      description: `Removed "${removedTrack.name}" from playlist`,
    });
  };

  const moveTrack = (fromIndex: number, toIndex: number) => {
    const newTracks = [...selectedTracks];
    const [movedTrack] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, movedTrack);
    setSelectedTracks(newTracks);
  };

  const clearPlaylist = () => {
    setSelectedTracks([]);
    toast({
      title: "Playlist cleared",
      description: "All tracks have been removed from the playlist",
    });
  };

  const validatePlaylist = () => {
    if (!playlistName.trim()) {
      toast({
        title: "Missing playlist name",
        description: "Please enter a name for your playlist",
        variant: "destructive",
      });
      return false;
    }

    if (selectedTracks.length === 0) {
      toast({
        title: "Empty playlist",
        description: "Please add at least one track to the playlist",
        variant: "destructive",
      });
      return false;
    }

    if (saveMethod === "server" && !saveLocation.trim()) {
      toast({
        title: "Missing save location",
        description: "Please select where to save the playlist",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const createPlaylistViaServer = async () => {
    try {
      const fileName = playlistName.endsWith(".m3u")
        ? playlistName
        : `${playlistName}.m3u`;

      const trackPaths = selectedTracks.map((track) => track.path);

      // Call backend API to create playlist
      const result = await PlaylistService.createPlaylist({
        name: fileName,
        tracks: trackPaths,
        savePath: saveLocation,
        eventId: selectedEvent !== "none" ? selectedEvent : undefined,
      });

      const fullPath = result.filePath;
      onPlaylistCreated?.(fullPath);

      toast({
        title: "Playlist created successfully",
        description: `"${fileName}" has been saved to ${saveLocation}`,
      });

      return true;
    } catch (error) {
      toast({
        title: "Error creating playlist",
        description: (error as Error).message,
        variant: "destructive",
      });
      return false;
    }
  };

  const createPlaylistViaDownload = async () => {
    try {
      // Generate M3U content
      const trackPaths = selectedTracks.map((track) => track.path).join("\n");
      const m3uContent = `#EXTM3U\n${selectedTracks
        .map((track) => `#EXTINF:-1,${track.name}\n${track.path}`)
        .join("\n")}`;

      // Create filename with .m3u extension
      const fileName = playlistName.endsWith(".m3u")
        ? playlistName
        : `${playlistName}.m3u`;

      // Create a Blob and download
      const blob = new Blob([m3uContent], { type: "audio/x-mpegurl" });
      const url = URL.createObjectURL(blob);

      // Create a temporary link and click it to trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Notify parent component
      const fullPath = `${saveLocation}/${fileName}`;
      onPlaylistCreated?.(fullPath);

      toast({
        title: "Playlist downloaded successfully",
        description: `"${fileName}" has been downloaded`,
      });

      return true;
    } catch (error) {
      toast({
        title: "Error creating playlist",
        description: (error as Error).message,
        variant: "destructive",
      });
      return false;
    }
  };

  const createPlaylist = async () => {
    if (!validatePlaylist()) return;

    setIsCreating(true);
    try {
      let success = false;

      if (saveMethod === "server") {
        success = await createPlaylistViaServer();
      } else {
        success = await createPlaylistViaDownload();
      }

      if (success) {
        // Reset form
        setSelectedTracks([]);
        setPlaylistName("");
        setSelectedEvent("none");
        setShowSaveDialog(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "Unknown";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTotalDuration = () => {
    const total = selectedTracks.reduce(
      (sum, track) => sum + (track.duration || 0),
      0,
    );
    return formatDuration(total);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileMusic className="h-5 w-5" />
            Playlist Creator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Event Selection */}
            <div className="space-y-2">
              <Label htmlFor="event-select">Link to Event (Optional)</Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    No event (Custom playlist)
                  </SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.uid} value={event.uid}>
                      {event.summary}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Playlist Name */}
            <div className="space-y-2">
              <Label htmlFor="playlist-name">Playlist Name</Label>
              <Input
                id="playlist-name"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="Enter playlist name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File Browser */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              File Browser
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <FileBrowser
              onFileSelect={handleFileSelect}
              onPlaylistSelect={handlePlaylistSelect}
              mediaOnly={true}
              compact={false}
            />
          </CardContent>
        </Card>

        {/* Playlist Builder */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Current Playlist ({selectedTracks.length} tracks)
              </div>
              <div className="flex gap-2">
                {selectedTracks.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearPlaylist}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
                <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      disabled={
                        selectedTracks.length === 0 || !playlistName.trim()
                      }
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Playlist
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Playlist</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Playlist Name</Label>
                        <Input
                          value={playlistName}
                          onChange={(e) => setPlaylistName(e.target.value)}
                          placeholder="Enter playlist name"
                        />
                      </div>

                      <div>
                        <Label>Save Method</Label>
                        <Select
                          value={saveMethod}
                          onValueChange={(value: "download" | "server") =>
                            setSaveMethod(value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="server">
                              <div className="flex items-center gap-2">
                                <Server className="h-4 w-4" />
                                Save to Server
                              </div>
                            </SelectItem>
                            <SelectItem value="download">
                              <div className="flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                Download File
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {saveMethod === "server" && (
                        <div>
                          <Label>Save Location</Label>
                          <div className="flex gap-2">
                            <Input
                              value={saveLocation}
                              onChange={(e) => setSaveLocation(e.target.value)}
                              placeholder="Enter save path"
                            />
                            <Button
                              variant="outline"
                              onClick={() =>
                                setSaveLocation(defaultPlaylistPath)
                              }
                            >
                              Default
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Default: {defaultPlaylistPath}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowSaveDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={createPlaylist} disabled={isCreating}>
                          {isCreating ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                          ) : saveMethod === "server" ? (
                            <Server className="h-4 w-4 mr-2" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          {saveMethod === "server"
                            ? "Save to Server"
                            : "Download"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardTitle>

            {/* Playlist Info Bar */}
            {selectedTracks.length > 0 && (
              <div className="px-4 py-2 border-b bg-muted/50 flex-shrink-0">
                <div className="flex justify-between text-sm">
                  <span>{selectedTracks.length} tracks</span>
                  <span>Total: {getTotalDuration()}</span>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {selectedTracks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center p-6">
                <div className="text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No tracks added yet</p>
                  <p className="text-sm">
                    Use the file browser to add tracks to your playlist
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {selectedTracks.map((track, index) => (
                    <div
                      key={`${track.path}-${index}`}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", index.toString());
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromIndex = parseInt(
                          e.dataTransfer.getData("text/plain"),
                        );
                        moveTrack(fromIndex, index);
                      }}
                    >
                      <div className="flex-shrink-0 text-sm text-muted-foreground w-8">
                        {index + 1}
                      </div>
                      <Music className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{track.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {track.path}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-xs text-muted-foreground">
                        {formatDuration(track.duration)}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTrack(index)}
                        className="flex-shrink-0 h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {selectedTracks.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Ready to create playlist with {selectedTracks.length} tracks
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(true)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Playlist
                </Button>
                <Button
                  onClick={() => {
                    // Quick save with auto-generated name
                    if (!playlistName.trim()) {
                      setPlaylistName(
                        `Playlist_${new Date().toISOString().slice(0, 10)}`,
                      );
                    }
                    setTimeout(() => createPlaylist(), 100);
                  }}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Quick Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
