export interface ICalendarEvent {
  summary: string;
  start: number | Date;
  end: number | Date;
  description?: string;
  location?: string;
  uid: string;
  rawString?: string;
  id?: string;
}
