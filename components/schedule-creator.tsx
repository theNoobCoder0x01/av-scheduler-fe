"use client";

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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generatePlaylistFilenames } from "@/lib/playlist-utils";
import { ICalendarEvent } from "@/models/calendar-event.model";
import { ActionType, ScheduledAction } from "@/models/scheduled-action.model";
import {
  PlaylistCheckResult,
  PlaylistService,
} from "@/services/playlist.service";
import { useScheduler } from "@/hooks/use-scheduler";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  FileMusic,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  Square,
  Trash2,
  XCircle,
  AlertTriangle,
  Settings,
  MoreHorizontal,
  Globe,
  Activity,
  Zap,
  Ban,
  PlayCircle,
  PauseCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ScheduleCreatorProps {
  events: ICalendarEvent[];
}

// Timezone options with labels
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
  { value: 'Europe/London', label: 'British Time (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Europe/Berlin', label: 'Central European Time' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
  { value: 'Asia/Shanghai', label: 'China Standard Time' },
  { value: 'Asia/Kolkata', label: 'India Standard Time' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time' },
  { value: 'UTC', label: 'Coordinated Universal Time' },
];

const TIMEZONE_STORAGE_KEY = 'scheduler_timezone_preference';

export default function ScheduleCreator({ events }: ScheduleCreatorProps) {
  // Enhanced hook integration
  const {
    actions,
    healthStatus,
    loading,
    refreshing,
    executingActions,
    error,
    createAction,
    deleteAction,
    pauseAction,
    resumeAction,
    executeAction,
    deleteMultipleActions,
    pauseMultipleActions,
    resumeMultipleActions,
    refresh,
    forceRefresh,
    clearError,
  } = useScheduler();

  // Form state
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [actionType, setActionType] = useState<ActionType>("play");
  const [actionTime, setActionTime] = useState<string>("");
  const [isDaily, setIsDaily] = useState(true);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    () => localStorage.getItem(TIMEZONE_STORAGE_KEY) || 
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [maxRetries, setMaxRetries] = useState<number>(3);

  // UI state
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [actionsWithPlaylistStatus, setActionsWithPlaylistStatus] = useState<any[]>([]);

  // Save timezone preference
  useEffect(() => {
    localStorage.setItem(TIMEZONE_STORAGE_KEY, selectedTimezone);
  }, [selectedTimezone]);

  // Check playlist availability for scheduled actions
  const checkPlaylistAvailability = useCallback(async (actionList: ScheduledAction[]) => {
    setIsLoadingPlaylists(true);
    try {
      const actionsWithStatus = [];

      for (const action of actionList) {
        let playlistStatus = undefined;

        // Only check for play actions that have an event name
        if (action.actionType === "play" && action.eventName) {
          try {
            const result: PlaylistCheckResult =
              await PlaylistService.checkPlaylistExists(action.eventName);
            playlistStatus = {
              found: result.found,
              availableFiles: result.data.map((p) => p.name),
              searchedFor: result.searchedFor,
            };
          } catch (error) {
            console.error(
              `Error checking playlist for ${action.eventName}:`,
              error,
            );
            playlistStatus = {
              found: false,
              availableFiles: [],
              searchedFor: action.eventName,
            };
          }
        }

        actionsWithStatus.push({
          ...action,
          playlistStatus,
        });
      }

      setActionsWithPlaylistStatus(actionsWithStatus);
    } catch (error) {
      console.error("Error checking playlist availability:", error);
    } finally {
      setIsLoadingPlaylists(false);
    }
  }, []);

  // Update playlist status when actions change
  useEffect(() => {
    if (actions.length > 0) {
      checkPlaylistAvailability(actions);
    } else {
      setActionsWithPlaylistStatus([]);
    }
  }, [actions, checkPlaylistAvailability]);

  const handleOpenMediaPlayer = () => {
    if (typeof window !== "undefined" && window.electron?.openMediaPlayer) {
      window.electron.openMediaPlayer();
    } else {
      // Fallback for web environment - open in new tab
      window.open("/media-player", "_blank");
    }
  };

  const handleAddAction = async () => {
    try {
      if (!actionTime) {
        throw new Error("Please specify a time for the action");
      }

      // Validate time format (now supports HH:MM:SS)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/;
      if (!timeRegex.test(actionTime)) {
        throw new Error(
          "Please use HH:MM or HH:MM:SS format (e.g., 14:30 or 14:30:45)"
        );
      }

      // Ensure seconds are included (default to :00 if not provided)
      let formattedTime = actionTime;
      if (actionTime.split(":").length === 2) {
        formattedTime += ":00";
      }

      let newAction: Omit<ScheduledAction, 'id'> = {
        actionType,
        time: formattedTime,
        isDaily,
        timezone: selectedTimezone,
        maxRetries,
        isActive: true,
      };

      if (!isDaily && selectedEvent) {
        const event = events.find((e) => e.uid === selectedEvent);
        if (!event) throw new Error("Selected event not found");
        
        if (typeof event.start === "number" && typeof event.end === "number") {
          // Create date object based on event date and action time
          const timeParts = formattedTime.split(":");
          const hours = parseInt(timeParts[0]);
          const minutes = parseInt(timeParts[1]);
          const seconds = parseInt(timeParts[2]);

          let actionDate: Date = new Date((event.start as number) * 1000);
          actionDate.setHours(hours, minutes, seconds, 0);

          // Convert to seconds
          const actionDateSeconds = Math.floor(actionDate.getTime() / 1000);

          // Validate time is within event duration
          if (
            actionDateSeconds < event.start ||
            actionDateSeconds > event.end
          ) {
            throw new Error(
              "The action time must be within the event's duration"
            );
          }

          newAction = {
            ...newAction,
            eventId: event.uid,
            eventName: event.summary,
            date: actionDate,
          };
        }
      }

      await createAction(newAction);

      // Reset form
      setActionTime("");
      setSelectedEvent("");
    } catch (error) {
      console.error("Error scheduling action:", error);
      // Error handling is done by the hook
    }
  };

  const handleRemoveAction = async (actionId: string) => {
    try {
      await deleteAction(actionId);
    } catch (error) {
      console.error("Error removing action:", error);
      // Error handling is done by the hook
    }
  };

  const handleExecuteAction = async (actionId: string) => {
    try {
      await executeAction(actionId);
    } catch (error) {
      console.error("Error executing action:", error);
      // Error handling is done by the hook
    }
  };

  const handlePauseAction = async (actionId: string) => {
    try {
      await pauseAction(actionId);
    } catch (error) {
      console.error("Error pausing action:", error);
      // Error handling is done by the hook
    }
  };

  const handleResumeAction = async (actionId: string) => {
    try {
      await resumeAction(actionId);
    } catch (error) {
      console.error("Error resuming action:", error);
      // Error handling is done by the hook
    }
  };

  const handleSelectAction = (actionId: string, checked: boolean) => {
    setSelectedActions(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(actionId);
      } else {
        newSet.delete(actionId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedActions(new Set(actions.map(a => a.id!).filter(Boolean)));
    } else {
      setSelectedActions(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedActions.size === 0) return;
    
    try {
      await deleteMultipleActions(Array.from(selectedActions));
      setSelectedActions(new Set());
    } catch (error) {
      console.error("Error deleting multiple actions:", error);
    }
  };

  const handleBulkPause = async () => {
    if (selectedActions.size === 0) return;
    
    try {
      await pauseMultipleActions(Array.from(selectedActions));
      setSelectedActions(new Set());
    } catch (error) {
      console.error("Error pausing multiple actions:", error);
    }
  };

  const handleBulkResume = async () => {
    if (selectedActions.size === 0) return;
    
    try {
      await resumeMultipleActions(Array.from(selectedActions));
      setSelectedActions(new Set());
    } catch (error) {
      console.error("Error resuming multiple actions:", error);
    }
  };

  const renderPlaylistStatus = (action: any) => {
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
              <p className="font-semibold">Playlist for: {searchedFor}</p>
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

  const formatTimestamp = (timestamp: number) => {
    return format(new Date(timestamp * 1000), "PPp");
  };

  const formatUptime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-lg">Loading scheduler...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Scheduler Error</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button 
              onClick={clearError} 
              variant="outline" 
              size="sm" 
              className="mt-3"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Health Status */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Scheduler Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${healthStatus.isInitialized ? 'text-green-600' : 'text-red-600'}`}>
                  {healthStatus.isInitialized ? '✅' : '❌'}
                </div>
                <div className="text-sm text-muted-foreground">Initialized</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{healthStatus.activeSchedules}</div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{healthStatus.scheduledEntries}</div>
                <div className="text-sm text-muted-foreground">Scheduled</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${healthStatus.failedActions > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {healthStatus.failedActions}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{formatUptime(healthStatus.uptime)}</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Creator */}
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center justify-between">
              <div>Schedule Media Actions</div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleOpenMediaPlayer}
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Media Player
                </Button>
                <Button 
                  onClick={refresh} 
                  size="icon"
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button 
                  onClick={forceRefresh} 
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Force Refresh
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
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {showAdvanced ? 'Hide' : 'Show'} Advanced
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-6">
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
                        <span>Start</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pause">
                      <div className="flex items-center">
                        <Pause className="mr-2 h-4 w-4" />
                        <span>Play/Pause</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="stop">
                      <div className="flex items-center">
                        <Square className="mr-2 h-4 w-4" />
                        <span>Close</span>
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
                    step="1"
                    className="pl-10"
                    value={actionTime}
                    onChange={(e) => setActionTime(e.target.value)}
                    placeholder="HH:MM:SS"
                  />
                </div>
              </div>

              {showAdvanced && (
                <>
                  <div>
                    <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                      <SelectTrigger>
                        <Globe className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Select value={maxRetries.toString()} onValueChange={(v) => setMaxRetries(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Max Retries" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No Retries</SelectItem>
                        <SelectItem value="1">1 Retry</SelectItem>
                        <SelectItem value="2">2 Retries</SelectItem>
                        <SelectItem value="3">3 Retries</SelectItem>
                        <SelectItem value="5">5 Retries</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              <div className="flex items-center">
                <Button onClick={handleAddAction} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action
                </Button>
              </div>
            </div>

            {/* Time format help text */}
            <div className="text-xs text-muted-foreground">
              💡 Time format: HH:MM:SS (e.g., 14:30:45) or HH:MM (seconds default to :00)
              {showAdvanced && (
                <>
                  <br />
                  🌍 Timezone: Actions will execute in the selected timezone
                  <br />
                  🔄 Max Retries: Number of retry attempts if action fails
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Actions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Scheduled Actions</span>
            {selectedActions.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {selectedActions.size} selected
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleBulkPause}>
                      <PauseCircle className="h-4 w-4 mr-2" />
                      Pause Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBulkResume}>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Resume Selected
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleBulkDelete}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actionsWithPlaylistStatus.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No actions scheduled yet. Add actions above to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        actions.length > 0 && 
                        selectedActions.size === actions.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule Type</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Playlist Status</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead className="text-right">Options</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionsWithPlaylistStatus.map((action, index) => (
                  <TableRow key={action.id || index}>
                    <TableCell>
                      <Checkbox
                        checked={selectedActions.has(action.id || '')}
                        onCheckedChange={(checked) => 
                          handleSelectAction(action.id || '', checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={action.isActive !== false ? 'default' : 'secondary'}>
                        {action.isActive !== false ? 'Active' : 'Paused'}
                      </Badge>
                    </TableCell>
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
                    <TableCell>
                      <span className="font-mono text-sm">{action.time}</span>
                    </TableCell>
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
                        {action.actionType === "play" && "Start"}
                        {action.actionType === "pause" && "Play/Pause"}
                        {action.actionType === "stop" && "Close"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {action.eventName ? (
                        <span className="font-medium">{action.eventName}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {action.timezone || 'Local'}
                      </span>
                    </TableCell>
                    <TableCell>{renderPlaylistStatus(action)}</TableCell>
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
                    <TableCell>
                      <span className="text-sm">
                        {action.retryCount || 0} / {action.maxRetries || 3}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {action.isActive !== false ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePauseAction(action.id!)}
                          >
                            <Ban className="h-3 w-3 mr-2" />
                            Pause
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResumeAction(action.id!)}
                          >
                            <PlayCircle className="h-3 w-3 mr-2" />
                            Resume
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExecuteAction(action.id!)}
                          disabled={executingActions.has(action.id || "")}
                        >
                          {executingActions.has(action.id || "") ? (
                            <>
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                              Executing...
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 mr-2" />
                              Execute
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleRemoveAction(action.id!)}
                          disabled={executingActions.has(action.id || "")}
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
    </div>
  );
}
