export type ActionType = "play" | "pause" | "stop" | "sleep" | "wake";

export interface ScheduledAction {
  id?: string;
  eventId?: string;
  eventName?: string;
  actionType: ActionType;
  time: string; // 24-hour format HH:MM:SS (now supports seconds)
  date?: Date;
  isDaily: boolean;
  timezone?: string; // IANA timezone identifier (e.g., 'America/New_York')
  lastRun?: number;
  nextRun?: number;
  createdAt?: number;
  updatedAt?: number;
  isActive?: boolean; // For soft deletion and pause/resume functionality
  retryCount?: number; // For error recovery
  maxRetries?: number; // Maximum retry attempts
  parentActionId?: string; // Links child sleep actions to their parent pause/stop action
}

// UI-only interface for creating actions with sleep-after configuration
export interface ScheduledActionFormData extends Omit<ScheduledAction, 'parentActionId'> {
  sleepAfterAction?: boolean; // Enable/disable automatic sleep after pause/stop
  sleepDelayMinutes?: number; // Delay before sleep: 1-5 minutes
}
