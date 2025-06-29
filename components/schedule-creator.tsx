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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { generatePlaylistFilenames } from "@/lib/playlist-utils";
import { ICalendarEvent } from "@/models/calendar-event.model";
import { ActionType, ScheduledAction } from "@/models/scheduled-action.model";
import { PlaylistService, PlaylistCheckResult } from "@/services/playlist.service";
import { ScheduledActionService } from "@/services/scheduler.service";
import { WebSocketService } from "@/services/web-socket.service";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle,
  Clock,
  FileMusic,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  Square,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ScheduleCreatorProps {
  events: ICalendarEvent[];
}

interface ScheduledActionWithPlaylist extends ScheduledAction {
  playlistStatus?: {
    found: boolean;
    availableFiles: string[];
    searchedFor: string;
  };
}

export default function ScheduleCreator({ events }: ScheduleCreatorProps) {
  const [scheduledActions, setScheduledActions] = useState<ScheduledActionWithPlaylist[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [actionType, setActionType] = useState<ActionType>("play");
  const [actionTime, setActionTime] = useState<string>("");
  const [isDaily, setIsDaily] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const { toast } = useToast();

  // Fetch schedules from the server
  const fetchSchedules = useCallback(async () => {
    try {
      const response = await ScheduledActionService.getAllScheduledActions();
      setScheduledActions(response);
      
      // Check playlist availability for each action
      await checkPlaylistAvailability(response);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast({
        title: "Error fetching schedules",
        description: "Failed to load scheduled actions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Check playlist availability for scheduled actions
  const checkPlaylistAvailability = async (actions: ScheduledAction[]) => {
    setIsLoadingPlaylists(true);
    try {
      const actionsWithPlaylistStatus: ScheduledActionWithPlaylist[] = [];
      
      for (const action of actions) {
        let playlistStatus = undefined;
        
        // Only check for play actions that have an event name
        if (action.actionType === "play" && action.eventName) {
          try {
            const result: PlaylistCheckResult = await PlaylistService.checkPlaylistExists(action.eventName);
            playlistStatus = {
              found: result.found,
              availableFiles: result.data.map(p => p.name),
              searchedFor: result.searchedFor,
            };
          } catch (error) {
            console.error(`Error checking playlist for ${action.eventName}:`, error);
            playlistStatus = {
              found: false,
              availableFiles: [],
              searchedFor: action.eventName,
            };
          }
        }
        
        actionsWithPlaylistStatus.push({
          ...action,
          playlistStatus,
        });
      }
      
      setScheduledActions(actionsWithPlaylistStatus);
    } catch (error) {
      console.error("Error checking playlist availability:", error);
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

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

  const renderPlaylistStatus = (action: ScheduledActionWithPlaylist) => {
    if (action.actionType !== "play" || !action.eventName) {
      return <span className="text-muted-foreground">-</span>;
    }

    if (isLoadingPlaylists) {
      return (
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm text-muted-foreground">Checking...</span>
        </div>
      );
    }

    if (!action.playlistStatus) {
      return <span className="text-muted-foreground">Unknown</span>;
    }

    const { found, availableFiles, searchedFor } = action.playlistStatus;
    const possibleFilenames = generatePlaylistFilenames(searchedFor);

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              {found ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    Available
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">
                    Missing
                  </span>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <div className="space-y-2">
              <p className="font-semibold">
                Playlist for: {searchedFor}
              </p>
              {found ? (
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✓ Found playlist files:
                  </p>
                  <ul className="text-xs space-y-1 mt-1">
                    {availableFiles.map((file, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <FileMusic className="h-3 w-3" />
                        {file}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    ✗ No playlist files found
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Searched for:
                  </p>
                  <ul className="text-xs space-y-1 mt-1">
                    {possibleFilenames.map((filename, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <FileMusic className="h-3 w-3" />
                        {filename}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
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
                  <TableHead>Playlist Status</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead className="text-right">Options</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledActions.map((action, index) => (
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
                      {renderPlaylistStatus(action)}
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