import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseAsync } from 'expo-sqlite';

import migrations from './migrations/migrations';
import * as schema from './schema';
import { seedDefaultCategories } from './seed';

export type AxisDatabase = ReturnType<typeof createDatabase>;

function createDatabase(sqlite: Awaited<ReturnType<typeof openDatabaseAsync>>) {
  return drizzle(sqlite, { schema });
}

let initialization: Promise<AxisDatabase> | undefined;

export function initializeDatabase(): Promise<AxisDatabase> {
  if (!initialization) {
    initialization = openDatabaseAsync('axis.db').then(async (sqlite) => {
      try {
        await sqlite.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
        const db = createDatabase(sqlite);
        await migrate(db, migrations);
        seedDefaultCategories(db);
        return db;
      } catch (error) {
        await sqlite.closeAsync().catch((closeError) => console.error('Database close failed', closeError));
        throw error;
      }
    }).catch((error) => {
      initialization = undefined;
      throw error;
    });
  }
  return initialization;
}
