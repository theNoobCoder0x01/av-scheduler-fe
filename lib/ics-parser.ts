import { ICalendarEvent } from "@/models/calendar-event.model";

export async function parseIcsFile(file: File): Promise<ICalendarEvent[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          throw new Error("Failed to read file");
        }

        const events = parseIcsContent(content);
        resolve(events);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };

    reader.readAsText(file);
  });
}

function parseIcsContent(content: string): ICalendarEvent[] {
  const events: ICalendarEvent[] = [];
  const lines = content.split("\n");

  let currentEvent: Partial<ICalendarEvent> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === "BEGIN:VEVENT") {
      currentEvent = {};
    } else if (line === "END:VEVENT" && currentEvent) {
      if (currentEvent.summary && currentEvent.start && currentEvent.end) {
        events.push(currentEvent as ICalendarEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      // Handle line continuations
      let fullLine = line;
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith(" ")) {
        fullLine += lines[i + 1].trim().substring(1);
        i++;
      }

      if (fullLine.startsWith("SUMMARY:")) {
        currentEvent.summary = fullLine.substring(8);
      } else if (fullLine.startsWith("DTSTART:")) {
        currentEvent.start = parseIcsDate(fullLine.substring(8));
      } else if (fullLine.startsWith("DTSTART;")) {
        // Handle more complex DTSTART with parameters
        const valueIndex = fullLine.indexOf(":");
        if (valueIndex !== -1) {
          currentEvent.start = parseIcsDate(fullLine.substring(valueIndex + 1));
        }
      } else if (fullLine.startsWith("DTEND:")) {
        currentEvent.end = parseIcsDate(fullLine.substring(6));
      } else if (fullLine.startsWith("DTEND;")) {
        // Handle more complex DTEND with parameters
        const valueIndex = fullLine.indexOf(":");
        if (valueIndex !== -1) {
          currentEvent.end = parseIcsDate(fullLine.substring(valueIndex + 1));
        }
      } else if (fullLine.startsWith("DESCRIPTION:")) {
        currentEvent.description = fullLine.substring(12).replace(/\\n/g, "\n");
      } else if (fullLine.startsWith("LOCATION:")) {
        currentEvent.location = fullLine.substring(9);
      } else if (fullLine.startsWith("UID:")) {
        currentEvent.uid = fullLine.substring(4);
      }
    }
  }

  return events;
}

function parseIcsDate(dateStr: string): Date {
  // Basic format: 20230215T120000Z
  if (dateStr.endsWith("Z")) {
    // UTC time
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6)) - 1; // JavaScript months are 0-based
    const day = parseInt(dateStr.slice(6, 8));

    if (dateStr.includes("T")) {
      // Has time component
      const hour = parseInt(dateStr.slice(9, 11));
      const minute = parseInt(dateStr.slice(11, 13));
      const second = parseInt(dateStr.slice(13, 15));

      return new Date(Date.UTC(year, month, day, hour, minute, second));
    } else {
      // Full day event
      return new Date(Date.UTC(year, month, day));
    }
  } else {
    // Local time without Z suffix
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6)) - 1;
    const day = parseInt(dateStr.slice(6, 8));

    if (dateStr.includes("T")) {
      const hour = parseInt(dateStr.slice(9, 11));
      const minute = parseInt(dateStr.slice(11, 13));
      const second = parseInt(dateStr.slice(13, 15));

      return new Date(year, month, day, hour, minute, second);
    } else {
      return new Date(year, month, day);
    }
  }
}
