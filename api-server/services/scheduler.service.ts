import { ScheduledAction } from "../../models/scheduled-action.model";
import { execute, query } from "../lib/db";
import { actionScheduler } from "../lib/scheduler";

export class SchedulerService {
  public static async getAllScheduledActions() {
    let dbResponse = await query(`
      SELECT
        sa.id,
        COALESCE(e.id, sa.event_id) as event_id,
        COALESCE(e.summary, sa.event_name) as event_name,
        sa.action_type,
        sa.time,
        sa.date,
        sa.is_daily,
        sa.last_run,
        sa.next_run,
        sa.created_at,
        sa.updated_at
      FROM scheduled_actions sa 
      LEFT JOIN calendar_events e ON
        e.start <= sa.next_run
        AND e.end >= sa.next_run
      ORDER BY sa.next_run ASC;
    `);

    // Map the response to frontend compatible format
    dbResponse = this.mapDbResponseToScheduledAction(dbResponse);

    console.info("getAllScheduledActions response", dbResponse);
    return dbResponse;
  }

  public static async getScheduledActionById(actionId: number) {
    if (!actionId?.toString()?.length) {
      throw new Error("Action ID is required");
    }

    let [dbResponse] = await query(
      `SELECT * FROM scheduled_actions WHERE id = ?`,
      [actionId],
    );

    if (!dbResponse) {
      throw Error("Scheduled action not found");
    }

    // Map the response to frontend compatible format
    dbResponse = this.mapDbResponseToScheduledAction([dbResponse])[0];
    return dbResponse;
  }

  public static async createScheduledAction(data: ScheduledAction) {
    if (!data) {
      throw new Error("Action data is required");
    }

    // Parse time into hours, minutes, and seconds (with seconds support)
    const timeParts = data.time.split(":");
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const seconds = timeParts.length > 2 ? parseInt(timeParts[2]) : 0;

    const now = new Date();

    // Set the time for today with seconds precision
    const todayWithTime = new Date(now);
    todayWithTime.setHours(hours, minutes, seconds, 0);

    // Calculate next run time
    let nextRun = Math.floor(todayWithTime.getTime() / 1000);
    if (todayWithTime < now) {
      // If time has passed today, set for tomorrow
      nextRun += 24 * 60 * 60;
    }

    const dbResponse = await execute(
      `
        INSERT INTO scheduled_actions (event_id, event_name, action_type, time, date, is_daily, last_run, next_run, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.eventId,
        data.eventName,
        data.actionType,
        data.time,
        data.date,
        data.isDaily ? 1 : 0,
        data.lastRun,
        nextRun,
        Math.floor(new Date().getTime() / 1000),
        Math.floor(new Date().getTime() / 1000),
      ],
    );

    console.info("createScheduledAction response", dbResponse);

    await this.updateScheduler();

    const [createdRow] = await query(
      `SELECT * FROM scheduled_actions WHERE id = last_insert_rowid()`,
    );

    return createdRow;
  }

  public static async updateScheduledAction(
    actionId: number,
    data: ScheduledAction,
  ) {
    if (!actionId?.toString()?.length) {
      throw new Error("Action ID is required");
    }
    if (!data) {
      throw new Error("Action data is required");
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
        actionId,
      ],
    );

    console.info("updateScheduledAction response", dbResponse);

    const [updatedRow] = await query(
      `SELECT * FROM scheduled_actions WHERE id = ?`,
      [actionId],
    );

    await this.updateScheduler();

    return updatedRow;
  }

  public static async patchScheduledAction(
    actionId: number,
    data: Partial<ScheduledAction>,
  ) {
    if (!actionId?.toString()?.length) {
      throw new Error("Action ID is required");
    }
    if (!data) {
      throw new Error("Action data is required");
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
      throw new Error("No fields to update");
    }

    updateValues.push(actionId);

    const dbResponse = await execute(
      `UPDATE scheduled_actions SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues,
    );

    const [updatedRow] = await query(
      `SELECT * FROM scheduled_actions WHERE id = ?`,
      [actionId],
    );

    await this.updateScheduler();
    return updatedRow;
  }

  public static async deleteScheduledAction(actionId: number) {
    if (!actionId?.toString()?.length) {
      throw new Error("Action ID is required");
    }

    const dbResponse = await execute(
      `DELETE FROM scheduled_actions WHERE id = ?`,
      [actionId],
    );

    console.info("deleteScheduledAction response", dbResponse);

    await this.updateScheduler();
    return dbResponse;
  }

  private static async updateScheduler() {
    actionScheduler.clearAllSchedules();
    actionScheduler.activeSchedules = this.mapDbResponseToScheduledAction(
      await query(`SELECT * FROM scheduled_actions`),
    );
    actionScheduler.initializeSchedules();
  }

  private static mapDbResponseToScheduledAction(dbResponse: any) {
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
}
