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
import { scheduler } from "@/lib/scheduler";
import { ActionType, ICalendarEvent, ScheduledAction } from "@/lib/types";
import { controlVlc } from "@/lib/vlc-controller";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  Pause,
  Play,
  Plus,
  Repeat,
  Square,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

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

  // Load saved schedules
  useEffect(() => {
    setScheduledActions(scheduler.getSchedules());
  }, []);

  // Clear all schedules when component unmounts
  useEffect(() => {
    return () => {
      scheduler.clearAllSchedules();
    };
  }, []);

  const handleAddAction = () => {
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

      // Create date object based on event date and action time
      const [hours, minutes] = actionTime.split(":").map(Number);
      let actionDate: number | Date = new Date(event.start);
      actionDate.setHours(hours, minutes, 0, 0);
      actionDate = Math.floor(actionDate.getTime() / 1000); // Convert to seconds
      // Validate time is within event duration
      if (actionDate < event.start || actionDate > event.end) {
        toast({
          title: "Invalid time",
          description: "The action time must be within the event's duration",
          variant: "destructive",
        });
        return;
      }

      newAction = {
        ...newAction,
        eventId: event.uid,
        eventName: event.summary,
        date: new Date(actionDate * 1000),
      };
    }

    // Schedule the action
    scheduler.scheduleAction(newAction);
    setScheduledActions(scheduler.getSchedules());

    toast({
      title: "Action scheduled",
      description: isDaily
        ? `Daily ${actionType} action scheduled for ${actionTime}`
        : `${actionType} action scheduled for ${newAction.eventName} at ${actionTime}`,
    });
  };

  const handleRemoveAction = (index: number) => {
    const action = scheduledActions[index];
    const scheduleId = action.isDaily
      ? `daily-${action.actionType}-${action.time}`
      : `${action.eventId}-${action.actionType}-${action.date?.getTime()}`;

    scheduler.removeSchedule(scheduleId);
    setScheduledActions(scheduler.getSchedules());

    toast({
      title: "Action removed",
      description: "The scheduled action has been removed",
    });
  };

  const executeAction = async (action: ScheduledAction) => {
    setIsExecuting(true);
    try {
      const result = await controlVlc(action.actionType, action.eventName);

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

  return (
    <div className="space-y-8">
      {/* Action Creator */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Media Actions</CardTitle>
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
                          {event.summary} ({format(event.start, "MMM d")})
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
                  <TableHead className="text-right">Options</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledActions
                  .sort((a, b) => {
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
                        {action.isDaily ? (
                          <span className="text-muted-foreground italic">
                            Based on current event
                          </span>
                        ) : action.eventName ? (
                          <span className="font-medium">
                            {action.eventName}
                          </span>
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
