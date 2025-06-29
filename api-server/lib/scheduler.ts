import { ScheduledAction } from "../../models/scheduled-action.model";
import { SchedulerService } from "../services/scheduler.service";
import { controlVlc } from "./vlc-controller";
import { broadcast } from "./web-socket";

class ActionScheduler {
  private static instance: ActionScheduler;
  private schedules = new Map<string, NodeJS.Timeout>();
  private dailySchedules = new Map<string, NodeJS.Timeout>();
  private _activeSchedules: ScheduledAction[] = [];

  private constructor() {}

  public static getInstance(): ActionScheduler {
    if (!ActionScheduler.instance) {
      ActionScheduler.instance = new ActionScheduler();
    }
    return ActionScheduler.instance;
  }

  get activeSchedules(): ScheduledAction[] {
    return this._activeSchedules;
  }

  set activeSchedules(value: ScheduledAction[]) {
    this._activeSchedules = value;
  }

  public async initializeSchedules(): Promise<void> {
    this._activeSchedules.forEach((action) => {
      this.scheduleAction(action);
    });
  }

  public async scheduleAction(action: ScheduledAction): Promise<void> {
    if (action.isDaily) {
      this.scheduleDailyAction(action);
    } else if (action.date) {
      this.scheduleOneTimeAction(action);
    }
  }

  public async removeSchedule(scheduleId: string): Promise<void> {
    await SchedulerService.deleteScheduledAction(parseInt(scheduleId));
    this.clearAllSchedules();
    await this.initializeSchedules();
  }

  public clearAllSchedules(): void {
    this.schedules.forEach(clearTimeout);
    this.schedules.clear();
    this.dailySchedules.forEach(clearInterval);
    this.dailySchedules.clear();
    this._activeSchedules = [];
  }

  private scheduleOneTimeAction(action: ScheduledAction): void {
    if (!action.date) return;
    const delay = action.date.getTime() - new Date().getTime();
    if (delay < 0) return;
    const scheduleId = `${action.id}`;
    const timeout = setTimeout(async () => {
      await this.executeAction(action);
      this.removeSchedule(scheduleId);
    }, delay);
    this.schedules.set(scheduleId, timeout);
  }

  private scheduleDailyAction(action: ScheduledAction): void {
    const [hours, minutes] = action.time.split(":").map(Number);
    const scheduleId = `daily-${action.actionType}-${action.time}`;
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);
    if (scheduledTime.getTime() < now.getTime()) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    const initialDelay = scheduledTime.getTime() - now.getTime();
    setTimeout(() => {
      this.executeAction(action);
      const interval = setInterval(() => {
        this.executeAction(action);
      }, 24 * 60 * 60 * 1000);
      this.dailySchedules.set(scheduleId, interval);
    }, initialDelay);
  }

  private async executeAction(action: ScheduledAction): Promise<void> {
    console.log("Executing scheduled action:", action);
    if (!action.actionType) {
      console.error("No action type specified");
      return;
    }
    if (!action.id) {
      console.error("No action ID specified");
      return;
    }
    try {
      const result = await controlVlc(action.actionType, action.eventName);
      console.log("Action executed successfully:", action.actionType);
      console.log("Result: " + JSON.stringify(result, null, 2));
      const now = Math.floor(Date.now() / 1000);
      const nextRun = action.isDaily ? now + 24 * 60 * 60 : undefined;
      await SchedulerService.patchScheduledAction(parseInt(action.id ?? ""), {
        lastRun: now,
        nextRun,
      });
      broadcast({
        type: "scheduledAction",
        action: {
          ...action,
          lastRun: now,
          nextRun,
        },
        result,
      });
    } catch (error) {
      console.error("Failed to execute scheduled action:", error);
      broadcast({
        type: "scheduledActionError",
        action,
        error: (error as Error).message,
      });
    }
  }
}

export const actionScheduler = ActionScheduler.getInstance();