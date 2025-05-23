import { query } from "../lib/db";

export class CalendarEventsService {
  public static async getCurrentCalendarEvent() {
    let now = Math.floor(new Date().getTime() / 1000) - 365 * 24 * 60 * 60;
    let dbResponse = await query(
      `
      SELECT
        *
      FROM calendar_events 
        WHERE start <= ? AND end >= ?
    `,
      [now, now]
    );

    console.info("getCurrentCalendarEvent response", dbResponse);
    return dbResponse;
  }
}
