"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { isFullDayEvent } from "@/lib/utils";
import { ICalendarEvent } from "@/models/calendar-event.model";
import { CalendarEventService } from "@/services/calendar-event.service";
import { format } from "date-fns";
import {
  Calendar,
  Check,
  Clock,
  Edit2,
  MapPin,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

interface EventCardProps {
  event: ICalendarEvent;
  onEventUpdate: (updatedEvent: ICalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
}

export default function EventCard({
  event,
  onEventUpdate,
  onEventDelete,
}: EventCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<ICalendarEvent>(event);
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (date: number | Date) => {
    if (typeof date === "number") {
      date = new Date(date * 1000);
    }
    return format(date, "PPP");
  };

  const formatTime = (date: number | Date) => {
    if (typeof date === "number") {
      date = new Date(date * 1000);
    }
    return format(date, "p");
  };

  const formatDateTimeForInput = (date: number | Date) => {
    if (typeof date === "number") {
      date = new Date(date * 1000);
    }
    return format(date, "yyyy-MM-dd'T'HH:mm");
  };

  const getEpochTimestamp = (date: number | Date) => {
    if (typeof date === "number") {
      date = new Date(date * 1000);
    }
    return Math.floor(date.getTime() / 1000);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedEvent({ ...event });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedEvent(event);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (event.id) {
        // Event is saved, make API call
        const updatedEvent = await CalendarEventService.updateCalendarEvent(
          event.id,
          {
            summary: editedEvent.summary,
            start: editedEvent.start,
            end: editedEvent.end,
            description: editedEvent.description,
            location: editedEvent.location,
          }
        );
        onEventUpdate(updatedEvent);
        toast({
          title: "Event updated",
          description: "The event has been updated successfully.",
        });
      } else {
        // Event is not saved, update in memory only
        onEventUpdate(editedEvent);
        toast({
          title: "Event updated",
          description: "The event has been updated in memory.",
        });
      }
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error updating event",
        description: "Failed to update the event.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (event.id) {
      try {
        await CalendarEventService.deleteCalendarEvent(event.id);
        onEventDelete(event.uid);
        toast({
          title: "Event deleted",
          description: "The event has been removed successfully.",
        });
      } catch (error) {
        toast({
          title: "Error deleting event",
          description: "Failed to delete the event.",
          variant: "destructive",
        });
      }
    } else {
      // Event is not saved, remove from memory
      onEventDelete(event.uid);
      toast({
        title: "Event removed",
        description: "The event has been removed from memory.",
      });
    }
  };

  const handleInputChange = (field: keyof ICalendarEvent, value: any) => {
    setEditedEvent((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDateTimeChange = (field: "start" | "end", value: string) => {
    const date = new Date(value);
    const epochTime = Math.floor(date.getTime() / 1000);
    setEditedEvent((prev) => ({
      ...prev,
      [field]: epochTime,
    }));
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="relative pb-2">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={editedEvent.summary}
                    onChange={(e) =>
                      handleInputChange("summary", e.target.value)
                    }
                    placeholder="Event title"
                    className="text-lg font-semibold"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isLoading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <CardTitle className="line-clamp-2 text-lg pr-16">
                    {event.summary}
                  </CardTitle>
                  <div className="absolute top-[0.75rem] right-[0.75rem] flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEdit}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDelete}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    {!event.id && (
                      <span className="text-xs text-yellow-500 ml-1">
                        Not saved
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Start Date & Time</label>
                    <Input
                      type="datetime-local"
                      value={formatDateTimeForInput(editedEvent.start)}
                      onChange={(e) =>
                        handleDateTimeChange("start", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Date & Time</label>
                    <Input
                      type="datetime-local"
                      value={formatDateTimeForInput(editedEvent.end)}
                      onChange={(e) =>
                        handleDateTimeChange("end", e.target.value)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Location</label>
                    <Input
                      value={editedEvent.location || ""}
                      onChange={(e) =>
                        handleInputChange("location", e.target.value)
                      }
                      placeholder="Event location"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={editedEvent.description || ""}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      placeholder="Event description"
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Calendar className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                    <div>
                      {formatDate(event.start)}
                      {!isFullDayEvent(event.start, event.end) && (
                        <div className="flex items-center mt-1">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>
                            {formatTime(event.start)} - {formatTime(event.end)}
                          </span>
                        </div>
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
              )}
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
  );
}