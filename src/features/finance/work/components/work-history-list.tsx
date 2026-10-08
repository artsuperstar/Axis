import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { FormButton, FormError } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Space } from '@/constants/theme';

import { financeError } from '../../errors';
import type { WorkDataAccess } from '../data';
import type { WorkHistoryPage, WorkItem, WorkPayment } from '../types';
import { WorkRow } from './work-row';

/** Shared paged content for a pushed archive or focused Client History sheet. */
export function WorkHistoryList({ access, refreshToken, counterpartyId, onOpenJob, renderReceipt }: {
  access: WorkDataAccess; refreshToken: unknown; counterpartyId?: string;
  onOpenJob: (item: WorkItem) => void; renderReceipt: (payment: WorkPayment) => ReactNode;
}) {
  const [history, setHistory] = useState<WorkHistoryPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const limit = useRef(20);
  const reload = useCallback(() => {
    try { setHistory(access.readHistory(limit.current, undefined, counterpartyId)); setError(null); }
    catch (cause) { setError(financeError(cause, 'Unable to load Work history.')); }
  }, [access, counterpartyId]);
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => { if (!cancelled) reload(); });
    return () => { cancelled = true; };
  }, [reload, refreshToken]);
  function loadMore() {
    if (!history?.next) return;
    try {
      const next = access.readHistory(20, history.next, counterpartyId);
      setHistory({ ...next, items: [...history.items, ...next.items], payments: [...history.payments, ...next.payments] });
      limit.current += 20; setError(null);
    } catch (cause) { setError(financeError(cause, 'Unable to load more Work history.')); }
  }
  return <View testID="work-history-content" style={{ gap: Space.lg }}>
    <FormError message={error} />
    {!!error && <FormButton variant="quiet" label="Retry history" onPress={reload} />}
    <ThemedText type="sectionHeading" accessibilityRole="header">Jobs ({history?.settledCount ?? 0})</ThemedText>
    {!!history && !history.settledCount && <ThemedText type="secondary" themeColor="textSecondary">No settled work yet.</ThemedText>}
    {history?.items.map((item) => <WorkRow key={item.entry.id} item={item} onPress={() => onOpenJob(item)} />)}
    <ThemedText type="sectionHeading" accessibilityRole="header">Receipts ({history?.paymentCount ?? 0})</ThemedText>
    {history?.payments.map(renderReceipt)}
    {history?.next && <FormButton variant="quiet" label="Load more history" onPress={loadMore} />}
  </View>;
}
