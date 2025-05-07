"use client";

import EventList from "@/components/event-list";
import FileUploader from "@/components/file-uploader";
import ScheduleCreator from "@/components/schedule-creator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector } from "@/lib/store/hooks";
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
        <TabsList className="grid w-full grid-cols-2">
          {/* <TabsTrigger value="upload">Upload Calendar</TabsTrigger> */}
          <TabsTrigger value="events">View Events</TabsTrigger>
          <TabsTrigger value="schedule" disabled={events.length === 0}>
            Create Schedule
          </TabsTrigger>
        </TabsList>
        <TabsContent value="events" className="mt-6">
          <div className="space-y-6">
            <FileUploader events={events} />

            <EventList events={events} />
          </div>
        </TabsContent>
        <TabsContent value="schedule" className="mt-6">
          <ScheduleCreator events={events} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
