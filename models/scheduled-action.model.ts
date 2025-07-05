export type ActionType = "play" | "pause" | "stop";

export interface ScheduledAction {
  id?: string;
  eventId?: string;
  eventName?: string;
  actionType: ActionType;
  time: string; // 24-hour format HH:MM:SS (now supports seconds)
  date?: Date;
  isDaily: boolean;
  lastRun?: number;
  nextRun?: number;
  createdAt?: number;
  updatedAt?: number;
}
