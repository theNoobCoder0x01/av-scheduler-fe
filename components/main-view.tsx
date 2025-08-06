"use client";

import EventList from "@/components/event-list";
import FileUploader from "@/components/file-uploader";
import PlaylistCreator from "@/components/media-player/playlist-creator";
import ScheduleCreator from "@/components/schedule-creator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector } from "@/lib/store/hooks";
import { Calendar, Clock, FileMusic } from "lucide-react";
import { useEffect, useState } from "react";

// Custom hook to handle localStorage for active tab
function useActiveTab({
  isScheduleTabDisabled,
}: {
  isScheduleTabDisabled: boolean;
}) {
  const [activeTab, setActiveTab] = useState("events");

  useEffect(() => {
    // Load the active tab from localStorage on component mount
    const savedTab = localStorage.getItem("activeTab");
    if (savedTab && (!isScheduleTabDisabled || savedTab !== "schedule")) {
      setActiveTab(savedTab);
    }
  }, [isScheduleTabDisabled]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem("activeTab", value);
  };

  return { activeTab, handleTabChange };
}

export default function MainView() {
  const events = useAppSelector((state) => state.events.events);
  const { activeTab, handleTabChange } = useActiveTab({
    isScheduleTabDisabled: events.length === 0,
  });

  return (
    <div className="w-full">
      <Tabs
        defaultValue="events"
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Events
          </TabsTrigger>
          <TabsTrigger value="playlists" className="flex items-center gap-2">
            <FileMusic className="h-4 w-4" />
            Playlists
          </TabsTrigger>
          <TabsTrigger
            value="schedule"
            disabled={events.length === 0}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Scheduler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-6">
          <div className="space-y-6">
            <FileUploader events={events} />
            <EventList events={events} />
          </div>
        </TabsContent>

        <TabsContent value="playlists" className="mt-6">
          <PlaylistCreator
            events={events}
            onPlaylistCreated={(playlistPath) => {
              console.log("Playlist created:", playlistPath);
            }}
          />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <ScheduleCreator events={events} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
