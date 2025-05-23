"use client";

import PlaylistCreator from "@/components/playlist-creator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ICalendarEvent } from "@/models/calendar-event.model";
import { ActionType, ScheduledAction } from "@/models/scheduled-action.model";
import { ScheduledActionService } from "@/services/scheduler.service";
import { WebSocketService } from "@/services/web-socket.service";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  Square,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ScheduleCreatorProps {
  events: ICalendarEvent[];
}

export default function ScheduleCreator({ events }: ScheduleCreatorProps) {
  const [scheduledActions, setScheduledActions] = useState<ScheduledAction[]>(
    []
  );
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [actionType, setActionType] = useState<ActionType>("play");
  const [actionTime, setActionTime] = useState<string>("");
  const [isDaily, setIsDaily] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  // Fetch schedules from the server
  const fetchSchedules = useCallback(async () => {
    try {
      const response = await ScheduledActionService.getAllScheduledActions();
      setScheduledActions(response);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast({
        title: "Error fetching schedules",
        description: "Failed to load scheduled actions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleReloadAction = useCallback(async () => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleAddAction = async () => {
    try {
      if (!actionTime) {
        toast({
          title: "Missing information",
          description: "Please specify a time for the action",
          variant: "destructive",
        });
        return;
      }

      let newAction: ScheduledAction = {
        actionType,
        time: actionTime,
        isDaily,
      };

      if (!isDaily && selectedEvent) {
        const event = events.find((e) => e.uid === selectedEvent);
        if (!event) return;
        if (typeof event.start === "number" && typeof event.end === "number") {
          // Create date object based on event date and action time
          const [hours, minutes] = actionTime.split(":").map(Number);
          let actionDate: number | Date = new Date(
            (event.start as number) * 1000
          );
          actionDate.setHours(hours, minutes, 0, 0);
          // Convert to seconds
          const actionDateSeconds = Math.floor(actionDate.getTime() / 1000);
          // Validate time is within event duration
          if (
            actionDateSeconds < event.start ||
            actionDateSeconds > event.end
          ) {
            toast({
              title: "Invalid time",
              description:
                "The action time must be within the event's duration",
              variant: "destructive",
            });
            return;
          }

          newAction = {
            ...newAction,
            eventId: event.uid,
            eventName: event.summary,
            date: actionDate,
          };
        }
      }

      // Schedule the action
      let response = await ScheduledActionService.createAction(newAction);

      console.log("Scheduled action response", response);
      fetchSchedules();

      toast({
        title: "Action scheduled",
        description: isDaily
          ? `Daily ${actionType} action scheduled for ${actionTime}`
          : `${actionType} action scheduled for ${newAction.eventName} at ${actionTime}`,
      });
    } catch (err) {
      console.error("Error scheduling action:", err);
      toast({
        title: "Error scheduling action",
        description: "Failed to schedule the action.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAction = async (index: number) => {
    const action = scheduledActions[index];
    console.log("Removing action", action);

    const scheduleId = action.id;
    if (!scheduleId) {
      toast({
        title: "Error",
        description: "Failed to remove the action",
        variant: "destructive",
      });
      return;
    }

    try {
      await ScheduledActionService.deleteAction(scheduleId);
      toast({
        title: "Action removed",
        description: "The scheduled action has been removed",
      });
      fetchSchedules();
    } catch (error) {
      console.error("Error removing action:", error);
      toast({
        title: "Error removing action",
        description: "Failed to remove the scheduled action.",
        variant: "destructive",
      });
      return;
    }
  };

  const executeAction = async (action: ScheduledAction) => {
    setIsExecuting(true);
    try {
      // const result = await controlVlc(action.actionType, action.eventName);
      let result = { success: true, message: "Action executed" }; // Mocked result

      toast({
        title: result.success ? "Action executed" : "Action failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Action failed",
        description: `Failed to execute ${action.actionType} action: ${
          (error as Error).message
        }`,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    fetchSchedules();

    // Initialize WebSocket connection
    WebSocketService.connect();

    // Add WebSocket listener for scheduled action events
    const handleScheduledAction = (data: any) => {
      if (data.type === "scheduledAction") {
        toast({
          title: "Scheduled Action Executed",
          description: `${data.action.actionType} action executed for ${data.action.eventName}`,
        });
        fetchSchedules(); // Refresh the schedules to get updated last/next run times
      }
    };

    WebSocketService.addListener(handleScheduledAction);

    return () => {
      WebSocketService.removeListener(handleScheduledAction);
    };
  }, [toast, fetchSchedules]);

  const formatTimestamp = (timestamp: number) => {
    return format(new Date(timestamp * 1000), "PPp");
  };

  return (
    <div className="space-y-8">
      {/* Action Creator */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center justify-between">
              <div>Schedule Media Actions</div>
              <div>
                <Button onClick={handleReloadAction} size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="daily-mode"
                checked={isDaily}
                onCheckedChange={setIsDaily}
              />
              <label
                htmlFor="daily-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Daily Schedule
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {!isDaily && (
                <div className="md:col-span-2">
                  <Select
                    value={selectedEvent}
                    onValueChange={setSelectedEvent}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((event) => (
                        <SelectItem key={event.uid} value={event.uid}>
                          {event.summary} (
                          {format((event.start as number) * 1000, "MMM d")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className={isDaily ? "md:col-span-2" : ""}>
                <Select
                  value={actionType}
                  onValueChange={(value) => setActionType(value as ActionType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="play">
                      <div className="flex items-center">
                        <Play className="mr-2 h-4 w-4" />
                        <span>Play</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pause">
                      <div className="flex items-center">
                        <Pause className="mr-2 h-4 w-4" />
                        <span>Pause</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="stop">
                      <div className="flex items-center">
                        <Square className="mr-2 h-4 w-4" />
                        <span>Stop</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative w-full">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="time"
                    className="pl-10"
                    value={actionTime}
                    onChange={(e) => setActionTime(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddAction} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Actions List */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledActions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No actions scheduled yet. Add actions above to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Schedule Type</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead className="text-right">Options</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledActions
                  .sort((a, b) => {
                    if (!a) return 1;
                    if (!b) return -1;
                    if (a.isDaily && !b.isDaily) return -1;
                    if (!a.isDaily && b.isDaily) return 1;
                    if (a.date && b.date)
                      return a.date.getTime() - b.date.getTime();
                    return a.time.localeCompare(b.time);
                  })
                  .map((action, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <span className="flex items-center">
                          {action.isDaily ? (
                            <>
                              <Repeat className="mr-2 h-4 w-4 text-primary" />
                              Daily
                            </>
                          ) : (
                            <>
                              <Calendar className="mr-2 h-4 w-4 text-primary" />
                              One-time
                            </>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>{action.time}</TableCell>
                      <TableCell>
                        <span className="flex items-center">
                          {action.actionType === "play" && (
                            <Play className="mr-2 h-4 w-4 text-green-500" />
                          )}
                          {action.actionType === "pause" && (
                            <Pause className="mr-2 h-4 w-4 text-amber-500" />
                          )}
                          {action.actionType === "stop" && (
                            <Square className="mr-2 h-4 w-4 text-red-500" />
                          )}
                          {action.actionType.charAt(0).toUpperCase() +
                            action.actionType.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {action.eventName ? (
                          <span className="font-medium">
                            {action.eventName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {action.lastRun ? (
                          formatTimestamp(action.lastRun)
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {action.nextRun ? (
                          formatTimestamp(action.nextRun)
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => executeAction(action)}
                            disabled={isExecuting}
                          >
                            {isExecuting ? "Executing..." : "Execute"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleRemoveAction(index)}
                            disabled={isExecuting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Playlist Creator */}
      <PlaylistCreator events={events} />
    </div>
  );
}
