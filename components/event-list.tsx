"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch } from "@/lib/store/hooks";
import { setEvents } from "@/lib/store/slices/eventsSlice";
import { ICalendarEvent } from "@/lib/types";
import { isFullDayEvent } from "@/lib/utils";
import { CalendarEventService } from "@/services/calendar-event.service";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface EventListProps {
  events: ICalendarEvent[];
}

export default function EventList({ events }: EventListProps) {
  const { toast } = useToast();
  const dispatch = useAppDispatch();

  const [searchTerm, setSearchTerm] = useState("");

  const filteredEvents = events.filter(
    (event) =>
      event.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchEvents = useCallback(async () => {
    try {
      const response = await CalendarEventService.getAllCalendarEvents();
      console.log("response events", response);
      
      dispatch(setEvents(response));
    } catch (err) {
      toast({
        title: "Error fetching events",
        description: "Failed to fetch events from the server.",
        variant: "destructive",
      });
    }
  }, [dispatch, toast]);

  const formatDate = (date: number | Date) => {
    if (typeof date === "number") {
      date = new Date(date * 1000); // Convert seconds to milliseconds
    }
    return format(date, "PPP"); // 'Apr 29, 2023'
  };

  const formatTime = (date: number | Date) => {
    if (typeof date === "number") {
      date = new Date(date * 1000); // Convert seconds to milliseconds
    }
    return format(date, "p"); // '12:00 PM'
  };

  const getEpochTimestamp = (date: number | Date) => {
    if (typeof date === "number") {
      date = new Date(date * 1000); // Convert seconds to milliseconds
    }
    return Math.floor(date.getTime() / 1000);
  };

  const handleSaveEvents = async () => {
    try {
      let response = await CalendarEventService.createCalendarEvents(
        events
          .filter((calendarEvent) => !Boolean(calendarEvent.id?.toString()?.length))
          .map((calendarEvent) => ({
            summary: calendarEvent.summary,
            start: calendarEvent.start,
            end: calendarEvent.end,
            description: calendarEvent.description,
            location: calendarEvent.location,
            uid: calendarEvent.uid,
            rawString: JSON.stringify(calendarEvent),
          }))
      );

      if (response.length > 0) {
        toast({
          title: "Events saved successfully",
          description: "All unsaved events have been saved.",
          variant: "default",
        });
        fetchEvents();
      } else {
        toast({
          title: "No new events to save",
          description: "All events are already saved.",
          variant: "default",
        });
      }
    } catch (err) {
      toast({
        title: "Error saving events",
        description: "Failed to save events to the server.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between space-x-4">
        <div className="grow relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {events.some(
          (calendarEvent: ICalendarEvent) => !Boolean(calendarEvent.id?.toString()?.length)
        ) && (
          <p className="text-sm text-muted-foreground">
            Some events are not saved in the database.{" "}
            <a
              className="font-semibold cursor-pointer text-[#dddddd] hover:underline hover:text-[#ffffff]"
              onClick={handleSaveEvents}
            >
              Click to save events
            </a>
          </p>
        )}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center p-6">
          <p className="text-muted-foreground">No events found.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEvents.map((event) => (
          <TooltipProvider key={event.uid}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="line-clamp-2 text-lg">
                      {event.summary}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <Calendar className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                        <div>
                          {formatDate(event.start)}
                          {!isFullDayEvent(event.start, event.end) && (
                            <>
                              <div className="flex items-center mt-1">
                                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>
                                  {formatTime(event.start)} -{" "}
                                  {formatTime(event.end)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {event.location && (
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                          <span className="text-sm">{event.location}</span>
                        </div>
                      )}

                      {event.description && (
                        <div className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="space-y-2">
                  <p className="font-semibold">{event.summary}</p>
                  <div className="text-sm">
                    <p>
                      <strong>Start:</strong> {formatDate(event.start)}{" "}
                      {formatTime(event.start)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Epoch: {getEpochTimestamp(event.start)}
                    </p>
                    <p>
                      <strong>End:</strong> {formatDate(event.end)}{" "}
                      {formatTime(event.end)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Epoch: {getEpochTimestamp(event.end)}
                    </p>
                  </div>
                  {event.location && (
                    <p>
                      <strong>Location:</strong> {event.location}
                    </p>
                  )}
                  {event.description && (
                    <p>
                      <strong>Description:</strong> {event.description}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}
