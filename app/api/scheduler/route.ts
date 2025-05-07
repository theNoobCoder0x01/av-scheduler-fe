export const dynamic = "force-dynamic";
import { execute, query } from "@/lib/db";
import { scheduler } from "@/lib/scheduler";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get("id");
    let dbResponse;
    if (actionId?.length) {
      dbResponse = await query(`SELECT * FROM scheduled_actions WHERE id = ?`, [
        actionId,
      ]);
    } else {
      // fetch data from the database
      dbResponse = await query(`SELECT * FROM scheduled_actions`);
    }

    // Map the response to frontend compatible format
    dbResponse = mapDbResponseToScheduledAction(dbResponse);

    console.log("dbResponse", dbResponse);
    // Logic to create a new user in the database
    return Response.json(
      {
        message: "Scheduled action(s) fetched successfully",
        data: actionId?.length ? dbResponse[0] : dbResponse,
      },
      { status: 200 }
    );
  } catch (err: Error | any) {
    console.error("Error fetching action(s):", err);
    return Response.json(
      { message: "Failed to fetch action(s)", error: err.message },
      { status: 500 }
    );
  }
}

// Calculate next run time based on time and date or daily schedule
const calculateNextRun = (data: any) => {
  const [hours, minutes] = data.time.split(":").map(Number);
  let nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);

  if (!data.isDaily) {
    const [year, month, day] = data.date.split("-").map(Number);
    nextRun.setFullYear(year, month - 1, day);
  }

  // If the calculated time is in the past, add a day for daily schedules
  if (data.isDaily && nextRun < new Date()) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return Math.floor(nextRun.getTime() / 1000);
};

export async function POST(request: Request) {
  try {
    const data: any = await request.json();
    const dbResponse = await execute(
      `
      INSERT INTO scheduled_actions
      (
        event_id,
        event_name,
        action_type,
        time,
        date,
        is_daily,
        last_run,
        next_run
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.eventId,
        data.eventName,
        data.actionType,
        data.time,
        data.date,
        data.isDaily ? 1 : 0,
        data.lastRun,
        data.nextRun ?? calculateNextRun(data),
      ]
    );

    console.log("dbResponse create action", dbResponse);

    const [newRow] = await query(
      `SELECT * FROM scheduled_actions WHERE id = last_insert_rowid()`
    );

    return Response.json(
      { message: "Action created successfully", data: newRow },
      { status: 201 }
    );
  } catch (err: Error | any) {
    console.error("Error creating action:", err);
    return Response.json(
      { message: "Failed to create action", error: err.message },
      { status: 500 }
    );
  } finally {
    // Update the scheduler after creation
    await updateScheduler();
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    if (!data.id?.toString()?.length) {
      throw new Error("Action ID is required");
    }

    const dbResponse = await execute(
      `
        UPDATE scheduled_actions
        SET event_id = ?,
            event_name = ?,
            action_type = ?,
            time = ?,
            date = ?,
            is_daily = ?,
            last_run = ?,
            next_run = ?,
            updated_at = ?
        WHERE id = ?
      `,
      [
        data.eventId,
        data.eventName,
        data.actionType,
        data.time,
        data.date,
        data.isDaily ? 1 : 0,
        data.lastRun,
        data.nextRun,
        Math.floor(new Date().getTime() / 1000),
        data.id,
      ]
    );

    console.log("dbResponse update action", dbResponse);

    const [updatedRow] = await query(
      `SELECT * FROM scheduled_actions WHERE id = ?`,
      [data.id]
    );

    return Response.json(
      { message: "Scheduled action updated successfully", data: updatedRow },
      { status: 200 }
    );
  } catch (err: Error | any) {
    console.error("Error updating scheduled action:", err);
    return Response.json(
      { message: "Failed to update scheduled action", error: err.message },
      { status: 500 }
    );
  } finally {
    // Update the scheduler after update
    await updateScheduler();
  }
}

export async function PATCH(request: Request) {
  // implement patch functionality
  try {
    const data = await request.json();
    if (!data.id?.toString()?.length) {
      throw new Error("Action ID is required");
    }

    let updateFields = [];
    let updateValues = [];

    if (data.eventId !== undefined) {
      updateFields.push("event_id = ?");
      updateValues.push(data.eventId);
    }
    if (data.eventName !== undefined) {
      updateFields.push("event_name = ?");
      updateValues.push(data.eventName);
    }
    if (data.actionType !== undefined) {
      updateFields.push("action_type = ?");
      updateValues.push(data.actionType);
    }
    if (data.time !== undefined) {
      updateFields.push("time = ?");
      updateValues.push(data.time);
    }
    if (data.date !== undefined) {
      updateFields.push("date = ?");
      updateValues.push(data.date);
    }
    if (data.isDaily !== undefined) {
      updateFields.push("is_daily = ?");
      updateValues.push(data.isDaily ? 1 : 0);
    }
    if (data.lastRun !== undefined) {
      updateFields.push("last_run = ?");
      updateValues.push(data.lastRun);
    }
    if (data.nextRun !== undefined) {
      updateFields.push("next_run = ?");
      updateValues.push(data.nextRun);
    }

    if (updateFields.length) {
      updateFields.push("updated_at = ?");
      updateValues.push(Math.floor(new Date().getTime() / 1000));
    } else {
      return Response.json(
        { message: "Nothing to update", data: { id: data.id } },
        { status: 200 }
      );
    }

    updateValues.push(data.id);

    const dbResponse = await execute(
      `UPDATE scheduled_actions SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    const [updatedRow] = await query(
      `SELECT * FROM scheduled_actions WHERE id = ?`,
      [data.id]
    );

    return Response.json(
      { message: "Scheduled action patched successfully", data: updatedRow },
      { status: 200 }
    );
  } catch (err: Error | any) {
    console.error("Error patching scheduled action:", err);
    return Response.json(
      { message: "Failed to patch scheduled action", error: err.message },
      { status: 500 }
    );
  } finally {
    await updateScheduler();
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const actionId = Number(searchParams.get("id") ?? "");
    if (!actionId?.toString()?.length) {
      throw new Error("Action ID is required");
    }
    console.log("actionId", actionId);

    // Logic to delete the action from the database
    const dbResponse = await execute(
      `DELETE FROM scheduled_actions WHERE id = ?`,
      [actionId]
    );
    console.log("dbResponse", dbResponse);

    // Logic to create a new user in the database
    return Response.json(
      { message: "Scheduled action deleted successfully", data: dbResponse },
      { status: 200 }
    );
  } catch (err: Error | any) {
    console.error("Error deleting scheduled action:", err);
    return Response.json(
      { message: "Failed to delete scheduled action", error: err.message },
      { status: 500 }
    );
  } finally {
    // Update the scheduler after deletion
    await updateScheduler();
  }
}

async function updateScheduler() {
  scheduler.clearAllSchedules();
  scheduler.activeSchedules = mapDbResponseToScheduledAction(
    await query(`SELECT * FROM scheduled_actions`)
  );
  scheduler.initializeSchedules();
}

function mapDbResponseToScheduledAction(dbResponse: any) {
  return dbResponse.map((action: any) => ({
    id: action.id,
    eventId: action.event_id,
    eventName: action.event_name,
    actionType: action.action_type,
    time: action.time,
    date: action.date,
    isDaily: action.is_daily === 1,
    lastRun: action.last_run,
    nextRun: action.next_run,
    createdAt: action.created_at,
    updatedAt: action.updated_at,
  }));
}
