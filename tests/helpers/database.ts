/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite/driver';
import type { SQLiteDatabase } from 'expo-sqlite';

import * as schema from '../../src/database/schema';

const migrationDirectory = join(process.cwd(), 'src/database/migrations');
export const journal = JSON.parse(readFileSync(join(migrationDirectory, 'meta/_journal.json'), 'utf8'));
export const bundledMigrations = {
  journal,
  migrations: Object.fromEntries(journal.entries.map((entry: { idx: number; tag: string }) => [
    `m${String(entry.idx).padStart(4, '0')}`,
    readFileSync(join(migrationDirectory, `${entry.tag}.sql`), 'utf8'),
  ])),
};

// Adapt only the Expo statement boundary. Migrations, Drizzle, feature queries, and SQLite are real.
export function database(filename = ':memory:') {
  const sqlite = new DatabaseSync(filename);
  let trace: { sql: string; params: SQLInputValue[]; rows: number }[] | null = null;
  sqlite.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const client = {
    prepareSync(query: string) {
      const statement = sqlite.prepare(query);
      return {
        executeSync(params: SQLInputValue[]) {
          if (statement.columns().length) {
            const rows = statement.all(...params);
            trace?.push({ sql: query, params, rows: rows.length });
            return { getAllSync: () => rows, getFirstSync: () => rows[0], changes: 0, lastInsertRowId: 0 };
          }
          const result = statement.run(...params);
          trace?.push({ sql: query, params, rows: 0 });
          return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
        },
        executeForRawResultSync(params: SQLInputValue[]) {
          statement.setReturnArrays(true);
          const rows = statement.all(...params);
          trace?.push({ sql: query, params, rows: rows.length });
          return { getAllSync: () => rows };
        },
      };
    },
  } as unknown as SQLiteDatabase;
  function measure<T>(action: () => T) {
    const statements: NonNullable<typeof trace> = [];
    trace = statements;
    try {
      const value = action();
      return { value, statements, count: statements.length, rows: statements.reduce((sum, row) => sum + row.rows, 0) };
    } finally { trace = null; }
  }
  return { sqlite, db: drizzle(client, { schema }), measure };
}
