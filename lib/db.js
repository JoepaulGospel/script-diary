// lib/db.js
// One shared connection to your Turso database.
// Reads TURSO_DATABASE_URL and TURSO_AUTH_TOKEN from environment
// variables — set these in your Vercel project settings.
//
// You can either create a brand new Turso database for this app,
// or reuse the same one Logger uses — this app adds its own
// "scripts" table and won't touch Logger's tables either way.

import { createClient } from "@libsql/client";

let client;

export function getDb() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function ensureSchema() {
  const db = getDb();
  await db.execute(`CREATE TABLE IF NOT EXISTS scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Untitled',
    writer TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    shot INTEGER NOT NULL DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
  )`);

  // "writer" added after the original build — ALTER fails
  // harmlessly if the column is already there.
  try {
    await db.execute(`ALTER TABLE scripts ADD COLUMN writer TEXT NOT NULL DEFAULT ''`);
  } catch (e) { /* column already exists — fine */ }
}
