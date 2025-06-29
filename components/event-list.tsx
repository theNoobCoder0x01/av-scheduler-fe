"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch } from "@/lib/store/hooks";
import { setEvents } from "@/lib/store/slices/eventsSlice";
import { sortEventsByGujaratiTerms } from "@/lib/gujarati-calendar";
import { ICalendarEvent } from "@/models/calendar-event.model";
import { CalendarEventService } from "@/services/calendar-event.service";
import { Search } from "lucide-react";
import { useCallback, useEffect, useState, useMemo } from "react";
import EventCard from "./event-card";

interface EventListProps {
  events: ICalendarEvent[];
}

export default function EventList({ events }: EventListProps) {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [localEvents, setLocalEvents] = useState<ICalendarEvent[]>(events);

  // Update local events when props change
  useEffect(() => {
    setLocalEvents(events);
  }, [events]);

  // Sort and filter events with memoization for performance
  const sortedAndFilteredEvents = useMemo(() => {
    // First filter by search term
    const filtered = localEvents.filter(
      (event) =>
        event.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Then sort: Gujarati calendar events first, then by start date
    return sortEventsByGujaratiTerms(filtered);
  }, [localEvents, searchTerm]);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await CalendarEventService.getAllCalendarEvents();
      console.log("response events", response);
      dispatch(setEvents(response));
      setLocalEvents(response);
    } catch (err) {
      toast({
        title: "Error fetching events",
        description: "Failed to fetch events from the server.",
        variant: "destructive",
      });
    }
  }, [dispatch, toast]);

  const handleEventUpdate = (updatedEvent: ICalendarEvent) => {
    const updatedEvents = localEvents.map((event) =>
      event.uid === updatedEvent.uid ? updatedEvent : event
    );
    setLocalEvents(updatedEvents);
    dispatch(setEvents(updatedEvents));
  };

  const handleEventDelete = (eventUid: string) => {
    const updatedEvents = localEvents.filter((event) => event.uid !== eventUid);
    setLocalEvents(updatedEvents);
    dispatch(setEvents(updatedEvents));
  };

  const handleSaveEvents = async (uid?: string) => {
    try {
      let eventsToSave = localEvents.filter(
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
      await CalendarEventService.deleteAllCalendarEvents();
      toast({
        title: "All events deleted successfully",
        description: "All events have been deleted.",
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

  const hasUnsavedEvents = localEvents.some(
    (calendarEvent: ICalendarEvent) =>
      !Boolean(calendarEvent.id?.toString()?.length)
  );

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
        <div className="flex gap-2">
          {hasUnsavedEvents ? (
            <Button onClick={() => handleSaveEvents()} variant="default">
              Save All Events
            </Button>
          ) : (
            <Button onClick={handleDeleteAllEvents} variant="destructive">
              Delete All Events
            </Button>
          )}
        </div>
      </div>

      {/* Display sorting information */}
      {sortedAndFilteredEvents.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {sortedAndFilteredEvents.length} events 
          (Gujarati calendar events shown first, then sorted by date)
        </div>
      )}

      {sortedAndFilteredEvents.length === 0 && (
        <div className="text-center p-6">
          <p className="text-muted-foreground">No events found.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedAndFilteredEvents.map((event) => (
          <EventCard
            key={event.uid}
            event={event}
            onEventUpdate={handleEventUpdate}
            onEventDelete={handleEventDelete}
          />
        ))}
      </div>
    </div>
  );
}