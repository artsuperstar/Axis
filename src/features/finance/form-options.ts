import { commitmentKindLabels, commitmentKinds } from './commitments/types';
import { categoriesForType } from './form';
import { transactionTypeLabels, transactionTypes, type FinanceCategory, type TransactionType } from './types';

export const transactionTypeOptions = transactionTypes.map((value) => ({ value, label: transactionTypeLabels[value] }));
export const commitmentTypeOptions = commitmentKinds.map((value) => ({ value, label: commitmentKindLabels[value] }));

/** Finance owns direction and archival filtering; the shared field only renders these choices. */
export function financeCategoryOptions(categories: FinanceCategory[], type: TransactionType) {
  return [{ value: null, label: 'No category' }, ...categoriesForType(categories, type).map((category) => ({ value: category.id, label: category.name }))];
}

/** Complete this editor's creation flow only after Finance persistence succeeds. */
export function createFinanceCategorySelection(name: string, type: TransactionType, create: (name: string, type: TransactionType) => FinanceCategory,
  select: (id: string) => void, close: () => void) {
  const category = create(name, type);
  select(category.id);
  close();
}
