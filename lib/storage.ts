"use client";

import { ScheduledAction } from './types';

const STORAGE_KEY = 'media-scheduler-schedules';

export const storage = {
  saveSchedules(schedules: ScheduledAction[]): void {
    try {
      const data = JSON.stringify(schedules, (key, value) => {
        if (key === 'date' && value instanceof Date) {
          return value.toISOString();
        }
        return value;
      });
      localStorage.setItem(STORAGE_KEY, data);
    } catch (error) {
      console.error('Failed to save schedules:', error);
    }
  },

  loadSchedules(): ScheduledAction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return [];
      }
      return JSON.parse(data, (key, value) => {
        if (key === 'date' && typeof value === 'string') {
          return new Date(value);
        }
        return value;
      });
    } catch (error) {
      console.error('Failed to load schedules:', error);
      return [];
    }
  }
};