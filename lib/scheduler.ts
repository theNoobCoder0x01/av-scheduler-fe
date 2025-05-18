import { broadcast } from "@/app/api/ws/route";
import { ScheduledAction } from "@/lib/types";
import { controlVlc } from "@/lib/vlc-controller";
import { ScheduledActionService } from "@/services/scheduler.service";

class Scheduler {
  private static instance: Scheduler;
  private schedules: Map<string, NodeJS.Timeout>;
  private dailySchedules: Map<string, NodeJS.Timeout>;
  private _activeSchedules: ScheduledAction[] = [];
  public get activeSchedules(): ScheduledAction[] {
    return this._activeSchedules;
  }
  public set activeSchedules(value: ScheduledAction[]) {
    this._activeSchedules = value;
  }

  private constructor() {
    this.schedules = new Map();
    this.dailySchedules = new Map();
  }

  public static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  public async initializeSchedules(): Promise<void> {
    this.activeSchedules.forEach((action) => {
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
    await ScheduledActionService.deleteAction(scheduleId);
    this.clearAllSchedules();
    await this.initializeSchedules();
  }

  public clearAllSchedules(): void {
    // Clear one-time schedules
    this.schedules.forEach((timeout) => clearTimeout(timeout));
    this.schedules.clear();

    // Clear daily schedules
    this.dailySchedules.forEach((interval) => clearInterval(interval));
    this.dailySchedules.clear();

    // Clear active schedules
    this.activeSchedules = [];
  }

  private scheduleOneTimeAction(action: ScheduledAction): void {
    if (!action.date) return;

    const now = new Date();
    const scheduledTime = action.date;
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay < 0) return; // Don't schedule past actions

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

    // Calculate initial delay
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);

    if (scheduledTime.getTime() < now.getTime()) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const initialDelay = scheduledTime.getTime() - now.getTime();

    // Schedule initial execution
    setTimeout(() => {
      this.executeAction(action);

      // Set up daily interval
      const interval = setInterval(() => {
        this.executeAction(action);
      }, 24 * 60 * 60 * 1000); // 24 hours

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

      // Update the last_run and next_run fields in the database
      const now = Math.floor(Date.now() / 1000);
      const nextRun = action.isDaily ? now + 24 * 60 * 60 : undefined;

      await ScheduledActionService.patchAction(action.id, {
        lastRun: now,
        nextRun,
        id: action.id,
      });

      // Broadcast the action execution via WebSocket
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
      // Broadcast the error via WebSocket
      broadcast({
        type: "scheduledActionError",
        action,
        error: (error as Error).message,
      });
    }
  }
}

export const scheduler = Scheduler.getInstance();
