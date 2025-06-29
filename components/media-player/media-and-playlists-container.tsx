"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ICalendarEvent } from "@/models/calendar-event.model";
import { FileMusic, Music, Play } from "lucide-react";
import { useState } from "react";
import MediaPlayerContainer from "./media-player-container";
import PlaylistCreator from "./playlist-creator";

interface MediaAndPlaylistsContainerProps {
  events: ICalendarEvent[];
}

export default function MediaAndPlaylistsContainer({ events }: MediaAndPlaylistsContainerProps) {
  const [activeTab, setActiveTab] = useState("player");

  const handlePlaylistCreated = (playlistPath: string) => {
    // Switch to player tab and potentially load the created playlist
    setActiveTab("player");
    // You could add logic here to automatically load the created playlist in the player
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="player" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Media Player
          </TabsTrigger>
          <TabsTrigger value="creator" className="flex items-center gap-2">
            <FileMusic className="h-4 w-4" />
            Playlist Creator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="player" className="mt-6">
          <MediaPlayerContainer />
        </TabsContent>

        <TabsContent value="creator" className="mt-6">
          <PlaylistCreator 
            events={events} 
            onPlaylistCreated={handlePlaylistCreated}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}