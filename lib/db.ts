import path from "path";
import { Database, open } from "sqlite";
import sqlite3 from "sqlite3";

let db: Database | null = null;

let isDBInitialized = false;

async function connectDB() {
  if (db) return db;

  db = await open({
    filename: path.resolve("./db.sqlite"), // Path to your database file
    driver: sqlite3.Database,
  });

  if (!isDBInitialized) {
    await initializeDB();
  }

  return db;
}

export async function query(sql: any, params: any[] = []) {
  console.log(sql, params);

  const db = await connectDB();
  return db.all(sql, params);
}

export async function execute(sql: any, params: any[] = []) {
  console.log(sql, params);

  const db = await connectDB();
  return db.run(sql, params);
}

export default connectDB;

export async function initializeDB() {
  console.log("Initializing database...");

  const db = await connectDB();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT,
        event_name TEXT,
        action_type TEXT NOT NULL,
        time TEXT NOT NULL,
        date TEXT,
        is_daily INTEGER,
        last_run INTEGER,
        next_run INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
    CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        summary TEXT,
        start INTEGER,
        end INTEGER,
        description TEXT,
        location TEXT,
        uid TEXT,
        raw_string TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);
}
