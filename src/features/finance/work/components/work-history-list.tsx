import { useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, View, type SectionListProps, type ScrollViewInstance, type ScrollViewProps, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { useSheetScrollProps } from '@/components/adaptive-sheet';
import { UiText, useDesignColors } from '@/components/design-system';
import { FormButton, FormError } from '@/components/form-controls';
import { FormScrollView } from '@/components/form-selection-host';
import { DesignSpace as Space } from '@/constants/design-system-v2';

import { financeError } from '../../errors';
import type { WorkDataAccess } from '../data';
import type { WorkHistoryPage, WorkItem, WorkPayment } from '../types';
import { WorkHistoryJobCard } from './work-history-cards';

type Row = { kind: 'job'; item: WorkItem } | { kind: 'receipt'; payment: WorkPayment };
type HistorySection = { key: string; title: string; count: number | null; data: Row[] };

function HistoryScrollView({ sheetRef, ref, ...props }: ScrollViewProps & { sheetRef: Ref<ScrollViewInstance>; ref?: Ref<ScrollViewInstance> }) {
  const attach = useCallback((node: ScrollViewInstance | null) => {
    for (const target of [sheetRef, ref]) { if (typeof target === 'function') target(node); else if (target) target.current = node; }
  }, [sheetRef, ref]);
  return <FormScrollView {...props} ref={attach} />;
}
function SheetHistoryList(props: SectionListProps<Row, HistorySection>) {
  const { ref: sheetRef, ...bodyProps } = useSheetScrollProps();
  return <SectionList {...bodyProps} {...props} onScroll={event => { bodyProps.onScroll?.(event); props.onScroll?.(event); }}
    renderScrollComponent={scrollProps => <HistoryScrollView {...scrollProps} sheetRef={sheetRef} />} />;
}

/** Shared paged content for a pushed archive or focused Client History sheet. */
export function WorkHistoryList({ access, refreshToken, counterpartyId, onOpenJob, renderReceipt, sheet = false, actionError, onScroll }: {
  access: WorkDataAccess; refreshToken: unknown; counterpartyId?: string;
  onOpenJob: (item: WorkItem) => void; renderReceipt: (payment: WorkPayment, position: number, count: number) => ReactNode;
  sheet?: boolean; actionError?: string | null; onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}) {
  const colors = useDesignColors();
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
  const sections: HistorySection[] = [
    { key: 'jobs', title: 'Jobs', count: history?.settledCount ?? null, data: history?.items.map(item => ({ kind: 'job' as const, item })) ?? [] },
    { key: 'receipts', title: 'Receipts', count: history?.paymentCount ?? null, data: history?.payments.map(payment => ({ kind: 'receipt' as const, payment })) ?? [] },
  ];
  const listProps: SectionListProps<Row, HistorySection> = {
    testID: 'work-history-content', style: styles.list, contentContainerStyle: styles.content, sections,
    keyExtractor: row => row.kind === 'job' ? `job:${row.item.entry.id}` : `receipt:${row.payment.transaction.id}`,
    initialNumToRender: 8, maxToRenderPerBatch: 8, windowSize: 5, removeClippedSubviews: false, stickySectionHeadersEnabled: false,
    contentInsetAdjustmentBehavior: 'never', keyboardShouldPersistTaps: 'handled', onScroll, scrollEventThrottle: 16,
    ListHeaderComponent: <View><FormError appearance="v2" message={error ?? actionError ?? null} />
      {!!error && <FormButton appearance="v2" variant="quiet" label="Retry history" onPress={reload} />}
      {!history && !error && <ActivityIndicator color={colors.brand} accessibilityLabel="Loading Work history" />}
    </View>,
    renderSectionHeader: ({ section }) => <View style={[styles.sectionHeader, section.key === 'receipts' && { marginTop: Space.md, borderTopWidth: 1, borderTopColor: colors.border }]}>
      <UiText type="editorSection" accessibilityRole="header">{section.title} ({section.count ?? '…'})</UiText>
      {section.count !== null && section.data.length < section.count && <UiText type="metadata" color="textSecondary">Showing {section.data.length} of {section.count}</UiText>}
    </View>,
    renderSectionFooter: ({ section }) => section.count === 0 ? <UiText type="secondary" color="textSecondary" style={styles.empty}>{section.key === 'jobs' ? 'No settled work yet.' : 'No receipts yet.'}</UiText> : null,
    renderItem: ({ item, index, section }) => item.kind === 'job' ? <WorkHistoryJobCard item={item.item} onPress={() => onOpenJob(item.item)} /> : <>{renderReceipt(item.payment, index + 1, section.count ?? 0)}</>,
    ListFooterComponent: history?.next ? <FormButton appearance="v2" variant="quiet" label="Load more history" onPress={loadMore} /> : undefined,
  };
  return sheet ? <SheetHistoryList {...listProps} /> : <SectionList {...listProps} />;
}
const styles = StyleSheet.create({ list: { flex: 1 }, content: { padding: Space.md, paddingBottom: Space.lg }, sectionHeader: { paddingTop: Space.md, paddingBottom: Space.sm, gap: Space.xs }, empty: { paddingVertical: Space.sm } });
