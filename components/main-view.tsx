"use client";

import EventList from "@/components/event-list";
import FileUploader from "@/components/file-uploader";
import ScheduleCreator from "@/components/schedule-creator";
import MediaAndPlaylistsContainer from "@/components/media-player/media-and-playlists-container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector } from "@/lib/store/hooks";
import { Calendar, Clock, FileMusic, Music } from "lucide-react";
import { useState } from "react";

export default function MainView() {
  const [activeTab, setActiveTab] = useState("events");
  const events = useAppSelector((state) => state.events.events);

  return (
    <div className="w-full">
      <Tabs
        defaultValue="events"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Events
          </TabsTrigger>
          <TabsTrigger value="media" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            Media & Playlists
          </TabsTrigger>
          <TabsTrigger value="schedule" disabled={events.length === 0} className="flex items-center gap-2">
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
        
        <TabsContent value="media" className="mt-6">
          <MediaAndPlaylistsContainer events={events} />
        </TabsContent>
        
        <TabsContent value="schedule" className="mt-6">
          <ScheduleCreator events={events} />
        </TabsContent>
      </Tabs>
    </div>
  );
}