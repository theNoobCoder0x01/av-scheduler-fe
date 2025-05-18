export const dynamic = "force-dynamic";
import { execute, query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    // fetch data from the database
    const dbResponse = await query(`SELECT * FROM calendar_events`);
    console.log("dbResponse: " + dbResponse);
    // Logic to create a new user in the database
    return Response.json(
      { message: "Calendar events fetched successfully", data: dbResponse },
      { status: 200 }
    );
  } catch (err: Error | any) {
    console.error("Error fetching calendar events:", err);
    return Response.json(
      { message: "Failed to fetch calendar events", error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data: any = await request.json();
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
        item.summary,
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
      (
        summary,
        start,
        end,
        description,
        location,
        uid,
        raw_string
      )
      ${valuesString}
      `,
      valuesArray
    );

    console.log("dbResponse create calendar events: " + dbResponse);

    const newRows = await query(
      `SELECT * FROM calendar_events WHERE uid in (${data
        .map((_: any) => "?")
        .join(",")})`,
      data.map((calendarEvent: any) => calendarEvent?.uid)
    );

    return Response.json(
      { message: "Calendar events created successfully", data: newRows },
      { status: 201 }
    );
  } catch (err: Error | any) {
    console.error("Error creating calendar events:", err);
    return Response.json(
      { message: "Failed to create calendar events", error: err.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    if (!data.id?.length) {
      throw new Error("Calendar event ID is required");
    }

    const dbResponse = await execute(
      `
        UPDATE calendar_events
        SET summary = ?,
            start = ?,
            end = ?,
            description = ?,
            location = ?,
            uid = ?,
            raw_string = ?
        WHERE id = ?
      `,
      [
        data.summary,
        data.start,
        data.end,
        data.description,
        data.location,
        data.uid,
        data.rawString,
        data.id,
      ]
    );

    console.log("dbResponse update calendar event: " + dbResponse);

    const [updatedRow] = await query(
      `SELECT * FROM calendar_events WHERE id = ?`,
      [data.id]
    );

    return Response.json(
      { message: "Calendar event updated successfully", data: updatedRow },
      { status: 201 }
    );
  } catch (err: Error | any) {
    console.error("Error updating calendar event:", err);
    return Response.json(
      { message: "Failed to update calendar event", error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const calendarEventId = searchParams.get("id");
    if (!calendarEventId?.length) {
      throw new Error("Calendar event ID is required");
    }
    console.log("calendarEventId: " + calendarEventId);

    // Logic to delete the calendar event from the database
    const dbResponse = await execute(
      `
    DELETE FROM calendar_events WHERE id = ?
  `,
      [calendarEventId]
    );
    console.log("dbResponse: " + dbResponse);

    // Logic to create a new user in the database
    return Response.json(
      { message: "Calendar event deleted successfully", data: dbResponse },
      { status: 201 }
    );
  } catch (err: Error | any) {
    console.error("Error deleting calendar event:", err);
    return Response.json(
      { message: "Failed to delete calendar event", error: err.message },
      { status: 500 }
    );
  }
}
