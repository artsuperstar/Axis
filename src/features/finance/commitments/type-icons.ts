import type { UiIconName } from '@/components/ui-icon';
import type { Commitment } from './types';

/** Type identity alone selects the primary tile; titles/categories never participate. */
const icons: Record<Commitment['kind'], UiIconName> = { bill: 'receipt', subscription: 'repeat', installment: 'layers' };
export function commitmentTypeIcon(kind: Commitment['kind']): UiIconName { return icons[kind]; }
