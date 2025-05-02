"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ICalendarEvent } from "@/lib/types";
import { isFullDayEvent } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Search } from "lucide-react";
import { useState } from "react";

interface EventListProps {
  events: ICalendarEvent[];
}

export default function EventList({ events }: EventListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEvents = events.filter(
    (event) =>
      event.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
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
