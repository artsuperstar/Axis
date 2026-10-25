import type { UiIconName } from '@/components/ui-icon';

/** Presentation metadata for the existing seed IDs. Display names never select an icon. */
const builtInIcons: Readonly<Record<string, UiIconName>> = {
  'f59c0f08-1234-4d00-8a00-501112506001': 'home',
  'f59c0f08-1234-4d00-8a00-501112506002': 'utensils',
  'f59c0f08-1234-4d00-8a00-501112506003': 'car',
  'f59c0f08-1234-4d00-8a00-501112506004': 'shoppingBag',
  'f59c0f08-1234-4d00-8a00-501112506005': 'heart',
  'f59c0f08-1234-4d00-8a00-501112506006': 'paw',
  'f59c0f08-1234-4d00-8a00-501112506007': 'ticket',
  'f59c0f08-1234-4d00-8a00-501112506008': 'home',
  'f59c0f08-1234-4d00-8a00-501112506009': 'repeat',
  'f59c0f08-1234-4d00-8a00-501112506010': 'tag',
  'f59c0f08-1234-4d00-8a00-501112506011': 'briefcase',
  'f59c0f08-1234-4d00-8a00-501112506012': 'briefcase',
  'f59c0f08-1234-4d00-8a00-501112506013': 'tag',
};
export function financeCategoryIcon(categoryId: string | null): UiIconName {
  return categoryId === null ? 'receipt' : Object.hasOwn(builtInIcons, categoryId) ? builtInIcons[categoryId] : 'tag';
}
