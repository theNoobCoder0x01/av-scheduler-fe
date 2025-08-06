import { ScheduledAction } from "../../models/scheduled-action.model";
import { SchedulerService } from "../services/scheduler.service";
import { controlVlc } from "./vlc-controller";
import { broadcast } from "./web-socket";

interface ScheduleEntry {
  id: string;
  actionId: string;
  timeout?: NodeJS.Timeout;
  interval?: NodeJS.Timeout;
  type: 'daily' | 'one-time';
  scheduledTime: Date;
  isActive: boolean;
  timezone?: string;
}

interface PersistentState {
  lastInitialization: number;
  failedActions: string[];
  version: string;
}

class ActionScheduler {
  private static instance: ActionScheduler;
  private scheduleRegistry = new Map<string, ScheduleEntry>();
  private _activeSchedules: ScheduledAction[] = [];
  private isInitialized = false;
  private cleanupTimer?: NodeJS.Timeout;
  private persistentState: PersistentState = {
    lastInitialization: 0,
    failedActions: [],
    version: '2.0.0'
  };

  private constructor() {
    // Clean up registry every hour to remove stale entries
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleEntries();
    }, 60 * 60 * 1000);
    
    // Load persistent state
    this.loadPersistentState();
  }

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
    console.log("🔄 Initializing action scheduler...");
    
    // Clear existing schedules first
    this.clearAllSchedules();
    
    // Load fresh data from database
    try {
      const dbActions = await SchedulerService.getAllScheduledActions();
      this._activeSchedules = dbActions.filter(action => action.isActive !== false);
      
      console.log(`📋 Loaded ${this._activeSchedules.length} active actions from database`);
      
      // Handle missed schedules from app restarts
      await this.handleMissedSchedules();
      
      // Schedule each action
      for (const action of this._activeSchedules) {
        await this.scheduleAction(action);
      }
      
      this.isInitialized = true;
      this.persistentState.lastInitialization = Date.now();
      this.savePersistentState();
      
      console.log("✅ Scheduler initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize scheduler:", error);
      throw error;
    }
  }

  public async scheduleAction(action: ScheduledAction): Promise<void> {
    if (!action.id) {
      console.warn("⚠️  Skipping action without ID:", action);
      return;
    }

    // Skip inactive actions
    if (action.isActive === false) {
      console.log(`⏸️  Skipping inactive action: ${action.id}`);
      return;
    }

    // Remove existing schedule for this action if it exists
    await this.removeScheduleForAction(action.id);

    if (action.isDaily) {
      await this.scheduleDailyAction(action);
    } else if (action.date) {
      await this.scheduleOneTimeAction(action);
    }
  }

  public async removeSchedule(scheduleId: string): Promise<void> {
    // First remove from database
    try {
      await SchedulerService.deleteScheduledAction(parseInt(scheduleId));
    } catch (error) {
      console.error("❌ Failed to delete from database:", error);
      // Continue with cleanup even if DB deletion fails
    }

    // Then remove from scheduler
    await this.removeScheduleForAction(scheduleId);
    
    // Update active schedules
    this._activeSchedules = this._activeSchedules.filter(
      action => action.id !== scheduleId
    );
    
    console.log(`🗑️  Removed schedule for action ${scheduleId}`);
  }

  public async pauseAction(actionId: string): Promise<void> {
    try {
      await SchedulerService.patchScheduledAction(parseInt(actionId), {
        isActive: false
      });
      await this.removeScheduleForAction(actionId);
      console.log(`⏸️  Paused action: ${actionId}`);
    } catch (error) {
      console.error(`❌ Failed to pause action ${actionId}:`, error);
    }
  }

  public async resumeAction(actionId: string): Promise<void> {
    try {
      await SchedulerService.patchScheduledAction(parseInt(actionId), {
        isActive: true
      });
      
      // Find and reschedule the action
      const action = this._activeSchedules.find(a => a.id === actionId);
      if (action) {
        action.isActive = true;
        await this.scheduleAction(action);
        console.log(`▶️  Resumed action: ${actionId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to resume action ${actionId}:`, error);
    }
  }

  private async removeScheduleForAction(actionId: string): Promise<void> {
    const existingEntries = Array.from(this.scheduleRegistry.entries())
      .filter(([, entry]) => entry.actionId === actionId);

    for (const [registryId, entry] of existingEntries) {
      // Mark as inactive first to prevent execution
      entry.isActive = false;
      
      // Clear timers
      if (entry.timeout) {
        clearTimeout(entry.timeout);
      }
      if (entry.interval) {
        clearInterval(entry.interval);
      }
      
      // Remove from registry
      this.scheduleRegistry.delete(registryId);
      
      console.log(`🧹 Cleaned up schedule entry: ${registryId}`);
    }
  }

  public clearAllSchedules(): void {
    console.log("🧹 Clearing all schedules...");
    
    // Mark all as inactive first
    for (const entry of this.scheduleRegistry.values()) {
      entry.isActive = false;
    }
    
    // Clear all timers
    for (const entry of this.scheduleRegistry.values()) {
      if (entry.timeout) {
        clearTimeout(entry.timeout);
      }
      if (entry.interval) {
        clearInterval(entry.interval);
      }
    }
    
    // Clear registry
    this.scheduleRegistry.clear();
    this._activeSchedules = [];
    this.isInitialized = false;
    
    console.log("✅ All schedules cleared");
  }

  public shutdown(): void {
    console.log("🔌 Shutting down scheduler...");
    this.clearAllSchedules();
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.savePersistentState();
  }

  private async scheduleOneTimeAction(action: ScheduledAction): Promise<void> {
    if (!action.date || !action.id) return;

    const targetDate = this.getScheduledDateTime(action);
    const now = new Date();
    const delay = targetDate.getTime() - now.getTime();

    if (delay < 0) {
      console.warn(`⚠️  One-time action ${action.id} is scheduled in the past, skipping`);
      return;
    }

    const registryId = `one-time-${action.id}-${Date.now()}`;
    
    const scheduleEntry: ScheduleEntry = {
      id: registryId,
      actionId: action.id,
      type: 'one-time',
      scheduledTime: targetDate,
      isActive: true,
      timezone: action.timezone
    };

    const timeout = setTimeout(async () => {
      await this.executeActionSafely(action, registryId);
      // Auto-cleanup after execution
      this.scheduleRegistry.delete(registryId);
    }, delay);

    scheduleEntry.timeout = timeout;
    this.scheduleRegistry.set(registryId, scheduleEntry);

    console.log(`⏰ Scheduled one-time action "${action.actionType}" for ${targetDate.toISOString()}`);
    console.log(`⏰ Delay: ${Math.round(delay / 1000)} seconds`);
  }

  private async scheduleDailyAction(action: ScheduledAction): Promise<void> {
    if (!action.id) return;

    // Parse time with seconds support (HH:MM:SS or HH:MM)
    const timeParts = action.time.split(":");
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const seconds = timeParts.length > 2 ? parseInt(timeParts[2]) : 0;

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || 
        hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || 
        seconds < 0 || seconds > 59) {
      console.error(`❌ Invalid time format for action ${action.id}: ${action.time}`);
      return;
    }

    const scheduledTime = this.getNextDailyExecutionTime(action, hours, minutes, seconds);
    const now = new Date();
    const initialDelay = scheduledTime.getTime() - now.getTime();
    const registryId = `daily-${action.id}-${Date.now()}`;

    const scheduleEntry: ScheduleEntry = {
      id: registryId,
      actionId: action.id,
      type: 'daily',
      scheduledTime: scheduledTime,
      isActive: true,
      timezone: action.timezone
    };

    // Schedule the first execution
    const timeout = setTimeout(async () => {
      await this.executeActionSafely(action, registryId);
      
      // Set up daily interval only if the entry is still active
      const entry = this.scheduleRegistry.get(registryId);
      if (entry && entry.isActive) {
        const interval = setInterval(async () => {
          await this.executeActionSafely(action, registryId);
        }, 24 * 60 * 60 * 1000);
        
        entry.interval = interval;
      }
    }, initialDelay);

    scheduleEntry.timeout = timeout;
    this.scheduleRegistry.set(registryId, scheduleEntry);

    console.log(`⏰ Scheduled daily action "${action.actionType}" for ${action.time} (${hours}:${minutes}:${seconds})`);
    console.log(`⏰ First execution: ${scheduledTime.toISOString()}`);
    console.log(`⏰ Initial delay: ${Math.round(initialDelay / 1000)} seconds`);
    if (action.timezone) {
      console.log(`🌍 Timezone: ${action.timezone}`);
    }
  }

  private getScheduledDateTime(action: ScheduledAction): Date {
    if (!action.date) throw new Error("Date is required for one-time actions");
    
    let targetDate = new Date(action.date);
    
    // Apply timezone if specified
    if (action.timezone) {
      try {
        const timeInTimezone = new Intl.DateTimeFormat('en-US', {
          timeZone: action.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).formatToParts(targetDate);
        
        // Note: This is a simplified timezone conversion
        // For production, consider using a library like date-fns-tz
        console.log(`🌍 Converting time for timezone: ${action.timezone}`);
      } catch (error) {
        console.warn(`⚠️  Invalid timezone ${action.timezone}, using local time`);
      }
    }
    
    return targetDate;
  }

  private getNextDailyExecutionTime(action: ScheduledAction, hours: number, minutes: number, seconds: number): Date {
    const now = new Date();
    let scheduledTime: Date;
    
    if (action.timezone) {
      try {
        // Get current time in the specified timezone
        const timeInTimezone = new Date().toLocaleString("en-US", {
          timeZone: action.timezone
        });
        const timezoneNow = new Date(timeInTimezone);
        
        scheduledTime = new Date(timezoneNow);
        scheduledTime.setHours(hours, minutes, seconds, 0);
        
        // If the time has passed today in that timezone, schedule for tomorrow
        if (scheduledTime.getTime() <= timezoneNow.getTime()) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        
        // Convert back to local time for scheduling
        const offset = scheduledTime.getTime() - timezoneNow.getTime();
        scheduledTime = new Date(now.getTime() + offset);
        
      } catch (error) {
        console.warn(`⚠️  Error handling timezone ${action.timezone}, falling back to local time:`, error);
        scheduledTime = new Date(now);
        scheduledTime.setHours(hours, minutes, seconds, 0);
        
        if (scheduledTime.getTime() <= now.getTime()) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
      }
    } else {
      // Use local time
      scheduledTime = new Date(now);
      scheduledTime.setHours(hours, minutes, seconds, 0);
      
      if (scheduledTime.getTime() <= now.getTime()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }
    }
    
    return scheduledTime;
  }

  private async handleMissedSchedules(): Promise<void> {
    const now = Date.now();
    const lastInit = this.persistentState.lastInitialization;
    
    if (lastInit === 0) {
      console.log("📅 First initialization, no missed schedules to handle");
      return;
    }
    
    const downtime = now - lastInit;
    const downtimeHours = Math.round(downtime / (1000 * 60 * 60));
    
    console.log(`⏰ App was offline for ${downtimeHours} hours`);
    
    // Handle missed daily actions
    for (const action of this._activeSchedules) {
      if (!action.isDaily || !action.id) continue;
      
      const lastRun = action.lastRun ? action.lastRun * 1000 : 0;
      const timeSinceLastRun = now - lastRun;
      const hoursSinceLastRun = timeSinceLastRun / (1000 * 60 * 60);
      
      // If it's been more than 24 hours since last run and we missed the schedule
      if (hoursSinceLastRun > 24 && downtime > (12 * 60 * 60 * 1000)) {
        console.log(`⚠️  Detected missed daily action: ${action.id} (${action.actionType})`);
        
        // Option 1: Execute immediately (uncomment if desired)
        // await this.executeActionSafely(action, `missed-${action.id}`);
        
        // Option 2: Just log and wait for next scheduled time (current behavior)
        console.log(`📝 Action ${action.id} will execute at next scheduled time`);
      }
    }
  }

  private async executeActionSafely(action: ScheduledAction, registryId: string): Promise<void> {
    // First check if the schedule is still active
    const entry = this.scheduleRegistry.get(registryId);
    if (!entry || !entry.isActive) {
      console.log(`🚫 Skipping execution for inactive/deleted action: ${action.id}`);
      return;
    }

    // Verify action still exists in database
    try {
      if (!action.id) {
        console.error("❌ Action ID is missing");
        return;
      }

      const dbAction = await SchedulerService.getScheduledActionById(parseInt(action.id));
      
      // Check if action is still active in database
      if (dbAction.isActive === false) {
        console.log(`🚫 Action ${action.id} is disabled in database, skipping execution`);
        this.scheduleRegistry.delete(registryId);
        return;
      }
      
    } catch (error) {
      console.log(`🚫 Action ${action.id} no longer exists in database, skipping execution`);
      // Clean up the schedule entry
      this.scheduleRegistry.delete(registryId);
      return;
    }

    // Execute the action with retry logic
    await this.executeActionWithRetry(action);
  }

  private async executeActionWithRetry(action: ScheduledAction): Promise<void> {
    const maxRetries = action.maxRetries || 3;
    const currentRetryCount = action.retryCount || 0;
    
    try {
      await this.executeAction(action);
      
      // Reset retry count on successful execution
      if (currentRetryCount > 0) {
        await SchedulerService.patchScheduledAction(parseInt(action.id!), {
          retryCount: 0
        });
      }
      
    } catch (error) {
      console.error(`❌ Action execution failed (attempt ${currentRetryCount + 1}/${maxRetries}):`, error);
      
      if (currentRetryCount < maxRetries) {
        // Increment retry count and try again after delay
        const newRetryCount = currentRetryCount + 1;
        await SchedulerService.patchScheduledAction(parseInt(action.id!), {
          retryCount: newRetryCount
        });
        
        // Exponential backoff: 1s, 2s, 4s, etc.
        const retryDelay = Math.pow(2, currentRetryCount) * 1000;
        console.log(`🔄 Retrying in ${retryDelay}ms...`);
        
        setTimeout(async () => {
          const updatedAction = { ...action, retryCount: newRetryCount };
          await this.executeActionWithRetry(updatedAction);
        }, retryDelay);
      } else {
        console.error(`❌ Max retries exceeded for action ${action.id}`);
        this.persistentState.failedActions.push(action.id!);
        this.savePersistentState();
        
        // Broadcast failure
        broadcast({
          type: "scheduledActionFailure",
          action,
          error: `Max retries (${maxRetries}) exceeded`,
        });
      }
    }
  }

  private async executeAction(action: ScheduledAction): Promise<void> {
    console.log("⚡ Executing scheduled action:", {
      id: action.id,
      type: action.actionType,
      name: action.eventName,
      time: action.time,
      timezone: action.timezone
    });

    if (!action.actionType) {
      throw new Error("No action type specified");
    }

    if (!action.id) {
      throw new Error("No action ID specified");
    }

    const result = await controlVlc(action.actionType, action.eventName);
    console.log("✅ Action executed successfully:", action.actionType);
    
    const now = Math.floor(Date.now() / 1000);
    const nextRun = action.isDaily ? now + 24 * 60 * 60 : undefined;
    
    // Update database with execution time
    await SchedulerService.patchScheduledAction(parseInt(action.id), {
      lastRun: now,
      nextRun,
    });

    // Broadcast success
    broadcast({
      type: "scheduledAction",
      action: {
        ...action,
        lastRun: now,
        nextRun,
      },
      result,
    });

    console.log(`📈 Updated action ${action.id} with lastRun: ${now}, nextRun: ${nextRun}`);
  }

  private cleanupStaleEntries(): void {
    const now = Date.now();
    const staleEntries: string[] = [];

    for (const [registryId, entry] of this.scheduleRegistry.entries()) {
      // Remove one-time actions that are more than 1 hour old
      if (entry.type === 'one-time' && 
          (now - entry.scheduledTime.getTime()) > 60 * 60 * 1000) {
        staleEntries.push(registryId);
      }
    }

    for (const registryId of staleEntries) {
      const entry = this.scheduleRegistry.get(registryId);
      if (entry) {
        entry.isActive = false;
        if (entry.timeout) clearTimeout(entry.timeout);
        if (entry.interval) clearInterval(entry.interval);
        this.scheduleRegistry.delete(registryId);
      }
    }

    if (staleEntries.length > 0) {
      console.log(`🧹 Cleaned up ${staleEntries.length} stale schedule entries`);
    }
  }

  private loadPersistentState(): void {
    try {
      // In a real application, you might load this from a file or database
      // For now, we'll use a simple in-memory state
      console.log("📂 Loading persistent scheduler state...");
    } catch (error) {
      console.warn("⚠️  Could not load persistent state, using defaults");
    }
  }

  private savePersistentState(): void {
    try {
      // In a real application, you might save this to a file or database
      // For now, we'll just log it
      console.log("💾 Saving persistent scheduler state...", {
        lastInitialization: this.persistentState.lastInitialization,
        failedActionsCount: this.persistentState.failedActions.length
      });
    } catch (error) {
      console.warn("⚠️  Could not save persistent state:", error);
    }
  }

  // Debug method to inspect current schedules
  public getScheduleInfo(): any {
    return {
      registrySize: this.scheduleRegistry.size,
      activeSchedulesCount: this._activeSchedules.length,
      isInitialized: this.isInitialized,
      persistentState: this.persistentState,
      schedules: Array.from(this.scheduleRegistry.entries()).map(([id, entry]) => ({
        id,
        actionId: entry.actionId,
        type: entry.type,
        scheduledTime: entry.scheduledTime.toISOString(),
        isActive: entry.isActive,
        timezone: entry.timezone,
        hasTimeout: !!entry.timeout,
        hasInterval: !!entry.interval
      }))
    };
  }

  // Get health status for monitoring
  public getHealthStatus(): any {
    return {
      isInitialized: this.isInitialized,
      activeSchedules: this._activeSchedules.length,
      scheduledEntries: this.scheduleRegistry.size,
      failedActions: this.persistentState.failedActions.length,
      lastInitialization: new Date(this.persistentState.lastInitialization).toISOString(),
      uptime: Date.now() - this.persistentState.lastInitialization
    };
  }
}

export const actionScheduler = ActionScheduler.getInstance();

// Graceful shutdown handling
process.on('SIGINT', () => {
  actionScheduler.shutdown();
});

process.on('SIGTERM', () => {
  actionScheduler.shutdown();
});
