export type ActionType = "play" | "pause" | "stop";

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
}
