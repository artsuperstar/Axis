import type { AxisDatabase } from '@/database/client';
import { financeCategories } from '@/database/schema';

export const builtInFinanceCategories = [
  { id: 'f59c0f08-1234-4d00-8a00-501112506001', type: 'expense', name: 'Housing' },
  { id: 'f59c0f08-1234-4d00-8a00-501112506002', type: 'expense', name: 'Food' },
  { id: 'f59c0f08-1234-4d00-8a00-501112506003', type: 'expense', name: 'Transport' },
  { id: 'f59c0f08-1234-4d00-8a00-501112506004', type: 'expense', name: 'Shopping' },
  { id: 'f59c0f08-1234-4d00-8a00-501112506005', type: 'expense', name: 'Health' },
  { id: 'f59c0f08-1234-4d00-8a00-501112506006', type: 'expense', name: 'Pets' },
  { id: 'f59c0f08-1234-4d00-8a00-501112506007', type: 'expense', name: 'Entertainment' },
  { id: 'f59c0f08-1234-4d00-8a00-501112506008', type: 'expense', name: 'Utilities' },
  { id: 'f59c0f08-1234-4d00-8a00-501112506009', type: 'expense', name: 'Subscriptions' },
  { id: 'f59c0f08-1234-4d00-8a00-501112506010', type: 'expense', name: 'Other' },
  { id: 'f59c0f08-1234-4d00-8a00-501112506011', type: 'income', name: 'Salary' },
  { id: 'f59c0f08-1234-4d00-8a00-501112506012', type: 'income', name: 'Freelance' },
  { id: 'f59c0f08-1234-4d00-8a00-501112506013', type: 'income', name: 'Other' },
] as const;

export function seedFinanceCategories(db: AxisDatabase, now = Date.now()) {
  db.transaction((query) => {
    for (const category of builtInFinanceCategories) {
      query.insert(financeCategories).values({ ...category, isBuiltIn: true, createdAt: now, updatedAt: now }).onConflictDoNothing().run();
    }
  });
}
