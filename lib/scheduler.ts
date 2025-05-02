"use client";

import { ScheduledAction, ActionType } from '@/lib/types';
import { controlVlc } from '@/lib/vlc-controller';
import { storage } from './storage';

class Scheduler {
  private static instance: Scheduler;
  private schedules: Map<string, NodeJS.Timeout>;
  private dailySchedules: Map<string, NodeJS.Timeout>;
  private activeSchedules: ScheduledAction[];

  private constructor() {
    this.schedules = new Map();
    this.dailySchedules = new Map();
    this.activeSchedules = storage.loadSchedules();
    this.initializeSchedules();
  }

  public static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  private initializeSchedules(): void {
    this.activeSchedules.forEach(action => {
      this.scheduleAction(action);
    });
  }

  public getSchedules(): ScheduledAction[] {
    return this.activeSchedules;
  }

  public scheduleAction(action: ScheduledAction): void {
    this.activeSchedules.push(action);
    storage.saveSchedules(this.activeSchedules);

    if (action.isDaily) {
      this.scheduleDailyAction(action);
    } else if (action.date) {
      this.scheduleOneTimeAction(action);
    }
  }

  public removeSchedule(scheduleId: string): void {
    // Clear one-time schedule
    if (this.schedules.has(scheduleId)) {
      clearTimeout(this.schedules.get(scheduleId));
      this.schedules.delete(scheduleId);
    }
    
    // Clear daily schedule
    if (this.dailySchedules.has(scheduleId)) {
      clearInterval(this.dailySchedules.get(scheduleId));
      this.dailySchedules.delete(scheduleId);
    }

    // Remove from active schedules
    this.activeSchedules = this.activeSchedules.filter(action => {
      const actionId = action.isDaily
        ? `daily-${action.actionType}-${action.time}`
        : `${action.eventId}-${action.actionType}-${action.date?.getTime()}`;
      return actionId !== scheduleId;
    });
    storage.saveSchedules(this.activeSchedules);
  }

  public clearAllSchedules(): void {
    // Clear one-time schedules
    this.schedules.forEach(timeout => clearTimeout(timeout));
    this.schedules.clear();

    // Clear daily schedules
    this.dailySchedules.forEach(interval => clearInterval(interval));
    this.dailySchedules.clear();

    // Clear active schedules
    this.activeSchedules = [];
    storage.saveSchedules(this.activeSchedules);
  }

  private scheduleOneTimeAction(action: ScheduledAction): void {
    if (!action.date) return;

    const now = new Date();
    const scheduledTime = action.date;
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay < 0) return; // Don't schedule past actions

    const scheduleId = `${action.eventId}-${action.actionType}-${scheduledTime.getTime()}`;
    
    const timeout = setTimeout(async () => {
      await this.executeAction(action);
      this.removeSchedule(scheduleId);
    }, delay);

    this.schedules.set(scheduleId, timeout);
  }

  private scheduleDailyAction(action: ScheduledAction): void {
    const [hours, minutes] = action.time.split(':').map(Number);
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
    console.log('Executing scheduled action:', action);
    
    try {
      await controlVlc(action.actionType, action.eventName);
    } catch (error) {
      console.error('Failed to execute scheduled action:', error);
    }
  }
}

export const scheduler = Scheduler.getInstance();