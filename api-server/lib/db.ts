import fs from "fs";
import path from "path";
import { Database, open } from "sqlite";
import sqlite3 from "sqlite3";
import { APP_CONFIG_DIR } from "./settings";

let db: Database | null = null;
let isDBInitialized = false;

async function connectDB() {
  if (db) return db;

  // Ensure the config directory exists
  if (!fs.existsSync(APP_CONFIG_DIR)) {
    fs.mkdirSync(APP_CONFIG_DIR, { recursive: true });
    console.log(`📁 Created config directory: ${APP_CONFIG_DIR}`);
  }

  const dbPath = path.resolve(`${APP_CONFIG_DIR}/db.sqlite`);
  console.log(`🗄️  Connecting to database: ${dbPath}`);

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  if (!isDBInitialized) {
    await initializeDB();
  }

  return db;
}

export async function query(sql: any, params: any[] = []) {
  console.log("🔍 SQL Query:", sql, params);

  const db = await connectDB();
  return db.all(sql, params);
}

export async function execute(sql: any, params: any[] = []) {
  console.log("⚡ SQL Execute:", sql, params);

  const db = await connectDB();
  return db.run(sql, params);
}

export default connectDB;

export async function initializeDB() {
  if (isDBInitialized) {
    console.log("✅ Database already initialized");
    return;
  }

  console.log("🔧 Initializing database tables...");

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

  isDBInitialized = true;
  console.log("✅ Database tables initialized");
}
