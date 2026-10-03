import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite/driver';

import * as schema from './schema';

// Fixed UUIDs make startup seeding repeatable and preserve identity across future devices.
const defaultCategories = [
  { id: 'a24c3f45-3a72-4a1b-8ab4-501112506001', name: 'Personal' },
  { id: 'a24c3f45-3a72-4a1b-8ab4-501112506002', name: 'Work' },
  { id: 'a24c3f45-3a72-4a1b-8ab4-501112506003', name: 'Finance' },
  { id: 'a24c3f45-3a72-4a1b-8ab4-501112506004', name: 'Health' },
  { id: 'a24c3f45-3a72-4a1b-8ab4-501112506005', name: 'Shopping' },
  { id: 'a24c3f45-3a72-4a1b-8ab4-501112506006', name: 'Study' },
] as const;

export function seedDefaultCategories(db: ExpoSQLiteDatabase<typeof schema>, now = Date.now()) {
  db.transaction((tx) => {
    for (const category of defaultCategories) {
      tx.insert(schema.taskCategories).values({
        ...category,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      }).onConflictDoNothing().run();
    }
  });
}
