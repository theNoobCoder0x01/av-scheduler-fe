export interface ICalendarEvent {
  summary: string;
  start: number;
  end: number;
  description?: string;
  location?: string;
  uid: string;
}

export type ActionType = "play" | "pause" | "stop";

export interface ScheduledAction {
  eventId?: string;
  eventName?: string;
  actionType: ActionType;
  time: string; // 24-hour format HH:MM
  date?: Date;
  isDaily: boolean;
}

export interface PlaylistConfig {
  eventId: string;
  eventName: string;
  filePath: string;
}
