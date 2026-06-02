// src/modules/whatsapp/auth/authDB.ts
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbCache = new Map<number, Database.Database>();

function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_creds (
      id    TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_keys (
      type  TEXT NOT NULL,
      id    TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (type, id)
    );
  `);
}

export function getAuthDb(telegramId: number): Database.Database {
  if (dbCache.has(telegramId)) return dbCache.get(telegramId)!;

  const dbPath = path.resolve(`data/auth/${telegramId}.db`);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initTables(db);
  dbCache.set(telegramId, db);

  return db;
}

export function deleteAuthDb(telegramId: number): void {
  const db = dbCache.get(telegramId);
  if (db) {
    db.close();
    dbCache.delete(telegramId);
  }

  const dbPath = path.resolve(`data/auth/${telegramId}.db`);
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
}
