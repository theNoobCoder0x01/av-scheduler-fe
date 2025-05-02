import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isFullDayEvent(
  startDate: number | Date,
  endDate: number | Date
): boolean {
  if (typeof startDate === "number") {
    startDate = new Date(startDate * 1000); // Convert seconds to milliseconds
  }
  if (typeof endDate === "number") {
    endDate = new Date(endDate * 1000); // Convert seconds to milliseconds
  }
  // Check if the event starts at the beginning of a day (00:00:00)
  const isStartOfDay =
    startDate.getHours() === 0 &&
    startDate.getMinutes() === 0 &&
    startDate.getSeconds() === 0;

  // Check if the event ends at the end of a day (23:59:59) or start of next day (00:00:00)
  const isEndOfDay =
    (endDate.getHours() === 23 &&
      endDate.getMinutes() === 59 &&
      endDate.getSeconds() === 59) ||
    (endDate.getHours() === 0 &&
      endDate.getMinutes() === 0 &&
      endDate.getSeconds() === 0);

  // Event should start at beginning of day and end at end of day (or start of next day)
  return isStartOfDay && isEndOfDay;
}
