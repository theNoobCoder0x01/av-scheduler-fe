import { ICalendarEvent } from "@/models/calendar-event.model";
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082/api";

export class CalendarEventService {
  static async getAllCalendarEvents(): Promise<ICalendarEvent[]> {
    try {
      const { status, data: response } = await axios.get(
        `${API_BASE_URL}/calendar-events`
      );

      if (status !== 200) {
        throw new Error("Failed to fetch calendar events");
      }

      console.log("getAllEvents response", response);

      return response.data.map((calendarEvent: any) => ({
        summary: calendarEvent.summary,
        start: Number(calendarEvent.start),
        end: Number(calendarEvent.end),
        description: calendarEvent.description,
        location: calendarEvent.location,
        uid: calendarEvent.uid,
        rawString: calendarEvent.raw_string,
        id: calendarEvent.id,
      }));
    } catch (error) {
      throw new Error("Failed to fetch calendar events");
    }
  }

  static async getCalendarEventById(id: string): Promise<ICalendarEvent> {
    try {
      const { status, data: response } = await axios.get(
        `${API_BASE_URL}/calendar-events/${id}`
      );

      if (status !== 200) {
        throw new Error("Failed to fetch calendar event");
      }

      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch calendar event");
    }
  }

  static async createCalendarEvents(
    calendarEvents: Omit<ICalendarEvent, "id">[]
  ): Promise<ICalendarEvent[]> {
    try {
      const { status, data: response } = await axios.post(
        `${API_BASE_URL}/calendar-events`,
        calendarEvents
      );

      if (status !== 201) {
        throw new Error("Failed to create calendar event(s)");
      }

      return response.data;
    } catch (error) {
      throw new Error("Failed to create calendar event(s)");
    }
  }

  static async updateCalendarEvent(
    id: string,
    calendarEvent: Partial<ICalendarEvent>
  ): Promise<ICalendarEvent> {
    try {
      const { status, data: response } = await axios.put(
        `${API_BASE_URL}/calendar-events/${id}`,
        calendarEvent
      );

      if (status !== 200) {
        throw new Error("Failed to update calendar event");
      }

      return response.data;
    } catch (error) {
      throw new Error("Failed to update calendar event");
    }
  }

  static async deleteCalendarEvent(id: string): Promise<void> {
    try {
      const { status, data: response } = await axios.delete(
        `${API_BASE_URL}/calendar-events/${id}`
      );

      if (status !== 200) {
        throw new Error("Failed to delete calendar event");
      }

      return response.data ?? {};
    } catch (error) {
      throw new Error("Failed to delete calendar event");
    }
  }

  static async deleteAllCalendarEvents(): Promise<void> {
    try {
      const { status, data: response } = await axios.delete(
        `${API_BASE_URL}/calendar-events/all`
      );

      if (status !== 200) {
        throw new Error("Failed to delete all calendar event");
      }

      return response.data ?? {};
    } catch (error) {
      throw new Error("Failed to delete all calendar event");
    }
  }
}
