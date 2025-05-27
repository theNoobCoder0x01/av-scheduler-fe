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
import { isFullDayEvent } from "@/lib/utils";
import { ICalendarEvent } from "@/models/calendar-event.model";
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

  const handleSaveEvents = async (uid?: string) => {
    try {
      let eventsToSave = events.filter(
        (calendarEvent) => !Boolean(calendarEvent.id?.toString()?.length)
      );
      if (uid?.length) {
        eventsToSave = eventsToSave.filter(
          (calendarEvent) => calendarEvent.uid === uid
        );
      }

      let response = await CalendarEventService.createCalendarEvents(
        eventsToSave.map((calendarEvent) => ({
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
        description: "Failed to save events to the database.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllEvents = async () => {
    try {
      let response = await CalendarEventService.deleteAllCalendarEvents();

      toast({
        title: "All events deleted successfully",
        description: "All unsaved events have been saved.",
        variant: "default",
      });
      fetchEvents();
    } catch (err) {
      toast({
        title: "Error deleting all events",
        description: "Failed to delete all events from the database.",
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
          (calendarEvent: ICalendarEvent) =>
            !Boolean(calendarEvent.id?.toString()?.length)
        ) ? (
          <p className="text-sm">
            Some events are not saved in the database.{" "}
            <a
              className="font-semibold cursor-pointer text-[#1e3caa] dark:text-[#4dacff] hover:underline"
              onClick={() => handleSaveEvents()}
            >
              Click to save events
            </a>
          </p>
        ) : (
          <p className="text-sm">
            <a
              className="font-semibold cursor-pointer text-[#1e3caa] dark:text-[#4dacff] hover:underline"
              onClick={() => handleDeleteAllEvents()}
            >
              Delete all events
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
                  <CardHeader className="relative pb-2">
                    <CardTitle className="line-clamp-2 text-lg">
                      {event.summary}
                    </CardTitle>
                    <div className="absolute top-[0.75rem] right-[0.75rem] flex justify-between items-center">
                      {event.id ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            CalendarEventService.deleteCalendarEvent(
                              event.id ?? ""
                            )
                              .then(() => {
                                toast({
                                  title: "Event deleted",
                                  description:
                                    "The event has been removed successfully.",
                                  variant: "default",
                                });
                                fetchEvents();
                              })
                              .catch(() => {
                                toast({
                                  title: "Error deleting event",
                                  description: "Failed to delete the event.",
                                  variant: "destructive",
                                });
                              });
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        </button>
                      ) : (
                        // <a
                        //   className="font-semibold cursor-pointer text-[#1e3caa] dark:text-[#4dacff] hover:underline"
                        //   onClick={() => handleSaveEvents(event.uid)}
                        // >
                        //   Save event
                        // </a>
                        <span className="text-xs text-yellow-500">
                          Not saved
                        </span>
                      )}
                    </div>
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
