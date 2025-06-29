import express from "express";
import { execute, query } from "../lib/db";
import { format } from "date-fns";

const calendarEventsRouter = express.Router();

// GET all calendar events
calendarEventsRouter.get("/", async (req, res) => {
  try {
    const dbResponse = await query(
      `SELECT * FROM calendar_events ce ORDER BY ce.start, ce.end`
    );
    res.status(200).json({
      message: "Calendar events fetched successfully",
      data: dbResponse,
    });
  } catch (err: any) {
    console.error("Error fetching calendar events:", err);
    res.status(500).json({
      message: "Failed to fetch calendar events",
      error: err.message,
    });
  }
});

// GET calendar event by ID
calendarEventsRouter.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id?.length) {
      throw new Error("Calendar event ID is required");
    }

    const [event] = await query(`SELECT * FROM calendar_events WHERE id = ?`, [
      id,
    ]);

    if (!event) {
      res.status(404).json({
        message: "Calendar event not found",
      });
    }

    res.status(200).json({
      message: "Calendar event fetched successfully",
      data: event,
    });
  } catch (err: any) {
    console.error("Error fetching calendar event:", err);
    res.status(500).json({
      message: "Failed to fetch calendar event",
      error: err.message,
    });
  }
});

// POST new calendar events
calendarEventsRouter.post("/", async (req, res) => {
  try {
    const getMonthFromDate = (date: number | Date) => {
      if (typeof date === "number") {
        date = new Date(date * 1000); // Convert seconds to milliseconds
      }
      return format(date, "MM");
    };

    const data = req.body;
    if (!(data?.length >= 1)) {
      throw new Error("Calendar event data is required");
    }

    let valuesString = "VALUES ";
    const valuesArray: any = [];
    data.forEach((item: any, index: number) => {
      if (index === 0) {
        valuesString += "(?, ?, ?, ?, ?, ?, ?)";
      } else {
        valuesString += ", (?, ?, ?, ?, ?, ?, ?)";
      }
      valuesArray.push(
        `${getMonthFromDate(item.start)} ${item.summary}`,
        item.start,
        item.end,
        item.description,
        item.location,
        item.uid,
        item.rawString
      );
    });

    const dbResponse = await execute(
      `
            INSERT INTO calendar_events
            (summary, start, end, description, location, uid, raw_string)
            ${valuesString}
            `,
      valuesArray
    );

    const newRows = await query(
      `SELECT * FROM calendar_events WHERE uid in (${data
        .map(() => "?")
        .join(",")})`,
      data.map((calendarEvent: any) => calendarEvent?.uid)
    );

    res.status(201).json({
      message: "Calendar events created successfully",
      data: newRows,
    });
  } catch (err: any) {
    console.error("Error creating calendar events:", err);
    res.status(500).json({
      message: "Failed to create calendar events",
      error: err.message,
    });
  }
});

// PUT update calendar event
calendarEventsRouter.put("/:id", async (req, res) => {
  try {
    const calendarEventId = parseInt(req.params.id);
    const data = req.body;
    if (!calendarEventId?.toString()?.length) {
      throw new Error("Calendar event ID is required");
    }

    const getMonthFromDate = (date: number | Date) => {
      if (typeof date === "number") {
        date = new Date(date * 1000); // Convert seconds to milliseconds
      }
      return format(date, "MM");
    };

    const dbResponse = await execute(
      `UPDATE calendar_events
             SET summary = ?, start = ?, end = ?, description = ?,
                     location = ?, uid = ?, raw_string = ?, updated_at = ?
             WHERE id = ?`,
      [
        data.summary ? `${getMonthFromDate(data.start)} ${data.summary}` : data.summary,
        data.start,
        data.end,
        data.description,
        data.location,
        data.uid,
        data.rawString || JSON.stringify(data),
        Math.floor(new Date().getTime() / 1000),
        calendarEventId,
      ]
    );

    const [updatedRow] = await query(
      `SELECT * FROM calendar_events WHERE id = ?`,
      [calendarEventId]
    );

    res.status(200).json({
      message: "Calendar event updated successfully",
      data: updatedRow,
    });
  } catch (err: any) {
    console.error("Error updating calendar event:", err);
    res.status(500).json({
      message: "Failed to update calendar event",
      error: err.message,
    });
  }
});

// DELETE all calendar events
calendarEventsRouter.delete("/all", async (req, res) => {
  try {
    const dbResponse = await execute(`DELETE FROM calendar_events`);

    res.status(200).json({
      message: "All calendar events deleted successfully",
      data: dbResponse,
    });
  } catch (err: any) {
    console.error("Error deleting all calendar events:", err);
    res.status(500).json({
      message: "Failed to delete all calendar events",
      error: err.message,
    });
  }
});

// DELETE calendar event
calendarEventsRouter.delete("/:id", async (req, res) => {
  try {
    const calendarEventId = parseInt(req.params.id);
    if (!calendarEventId?.toString()?.length) {
      throw new Error("Calendar event ID is required");
    }

    const dbResponse = await execute(
      `DELETE FROM calendar_events WHERE id = ?`,
      [calendarEventId]
    );

    res.status(200).json({
      message: "Calendar event deleted successfully",
      data: dbResponse,
    });
  } catch (err: any) {
    console.error("Error deleting calendar event:", err);
    res.status(500).json({
      message: "Failed to delete calendar event",
      error: err.message,
    });
  }
});

export default calendarEventsRouter;