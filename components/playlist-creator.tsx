"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { generateM3uContent } from "@/lib/playlist-utils";
import { ICalendarEvent } from "@/models/calendar-event.model";
import { PlaylistConfig } from "@/models/playlist-config.model";
import { FileMusic, Music, Save } from "lucide-react";
import { useState } from "react";

interface PlaylistCreatorProps {
  events: ICalendarEvent[];
}

export default function PlaylistCreator({ events }: PlaylistCreatorProps) {
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [mediaFiles, setMediaFiles] = useState<string>("");
  const [playlists, setPlaylists] = useState<PlaylistConfig[]>([]);
  const { toast } = useToast();

  const handleCreatePlaylist = () => {
    if (!selectedEvent || !mediaFiles.trim()) {
      toast({
        title: "Missing information",
        description: "Please select an event and enter media file paths",
        variant: "destructive",
      });
      return;
    }

    const event = events.find((e) => e.uid === selectedEvent);
    if (!event) return;

    // Generate and save the M3U file with the event name
    try {
      const fileName = `${event.summary.replace(/[<>:"/\\|?*]/g, "_")}.m3u`;
      const m3uContent = generateM3uContent(mediaFiles);

      // Create a Blob with the content
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

      // Add to playlists list
      const newPlaylist: PlaylistConfig = {
        eventId: event.uid,
        eventName: event.summary,
        filePath: fileName,
      };

      setPlaylists([...playlists, newPlaylist]);
      setMediaFiles("");

      toast({
        title: "Playlist created",
        description: `Playlist "${fileName}" has been created and downloaded`,
      });
    } catch (error) {
      toast({
        title: "Error creating playlist",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Event Playlists</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.uid} value={event.uid}>
                      {event.summary}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleCreatePlaylist}
                className="w-full"
                disabled={!selectedEvent || !mediaFiles.trim()}
              >
                <Save className="mr-2 h-4 w-4" />
                Create and Download Playlist
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="mediaFiles" className="text-sm font-medium">
              Media Files (one per line)
            </label>
            <textarea
              id="mediaFiles"
              className="w-full min-h-[150px] p-3 rounded-md border border-input bg-transparent"
              placeholder="C:\Music\song1.mp3&#10;C:\Music\song2.mp3&#10;http://example.com/stream.mp3"
              value={mediaFiles}
              onChange={(e) => setMediaFiles(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter file paths or URLs, one per line. These will be included in
              the M3U playlist.
            </p>
          </div>

          {playlists.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center">
                <FileMusic className="mr-2 h-4 w-4" />
                Created Playlists
              </h3>
              <ul className="divide-y rounded-md border">
                {playlists.map((playlist, index) => (
                  <li key={index} className="p-2 flex items-center">
                    <Music className="mr-2 h-4 w-4 text-primary" />
                    <span>{playlist.filePath}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
