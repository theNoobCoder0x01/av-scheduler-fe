"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUploader from "@/components/file-uploader";
import EventList from "@/components/event-list";
import ScheduleCreator from "@/components/schedule-creator";
import { useAppSelector } from "@/lib/store/hooks";

export default function MainView() {
  const [activeTab, setActiveTab] = useState("upload");
  const events = useAppSelector((state) => state.events.events);

  const handleEventsLoaded = () => {
    setActiveTab("events");
  };

  return (
    <div className="w-full">
      <Tabs defaultValue="upload" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload Calendar</TabsTrigger>
          <TabsTrigger value="events" disabled={events.length === 0}>
            View Events
          </TabsTrigger>
          <TabsTrigger value="schedule" disabled={events.length === 0}>
            Create Schedule
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="mt-6">
          <FileUploader onEventsLoaded={handleEventsLoaded} />
        </TabsContent>
        <TabsContent value="events" className="mt-6">
          <EventList events={events} />
        </TabsContent>
        <TabsContent value="schedule" className="mt-6">
          <ScheduleCreator events={events} />
        </TabsContent>
      </Tabs>
    </div>
  );
}