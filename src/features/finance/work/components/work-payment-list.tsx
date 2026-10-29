import { useCallback, type ReactElement, type Ref } from 'react';
import { FlatList, Platform, StyleSheet, View, useWindowDimensions, type ScrollViewInstance, type ScrollViewProps } from 'react-native';

import { useSheetScrollProps } from '@/components/adaptive-sheet';
import { GroupSurface, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { FormField } from '@/components/form-controls';
import { FormScrollView } from '@/components/form-selection-host';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';
import { dateLabel } from '@/utils/calendar';

import { formatBrlAmount } from '../../money';
import { jobTitle } from '../presentation';
import type { WorkItem, WorkPaymentDraft } from '../types';

type Allocation = WorkPaymentDraft['allocations'][number];

/** Preserve both VirtualizedList's responder and the sheet's focused-field reveal ref. */
function PaymentScrollView({ sheetRef, ref, ...props }: ScrollViewProps & { sheetRef: Ref<ScrollViewInstance>; ref?: Ref<ScrollViewInstance> }) {
  const attach = useCallback((node: ScrollViewInstance | null) => {
    for (const target of [sheetRef, ref]) {
      if (typeof target === 'function') target(node);
      else if (target) target.current = node;
    }
  }, [sheetRef, ref]);
  return <FormScrollView {...props} ref={attach} />;
}

/** Allocation drafts live in WorkPaymentEditor, outside recycled cells. No per-row source reads. */
export function WorkPaymentList({ items, allocations, errors, header, footer, onToggle, onAmount }: {
  items: WorkItem[]; allocations: ReadonlyMap<string, Allocation>; errors: ReadonlyMap<string, string>;
  header: ReactElement; footer: ReactElement; onToggle: (item: WorkItem) => void; onAmount: (id: string, value: string) => void;
}) {
  const { ref: sheetRef, ...bodyProps } = useSheetScrollProps();
  const colors = useDesignColors();
  return <FlatList {...bodyProps} testID="work-payment-list" data={items} extraData={allocations}
    keyExtractor={item => item.entry.id} initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5} removeClippedSubviews={false}
    renderScrollComponent={props => <PaymentScrollView {...props} sheetRef={sheetRef} />}
    contentContainerStyle={styles.content} ListHeaderComponent={header} ListFooterComponent={footer}
    renderItem={({ item }) => <View style={[styles.rowEdge, { backgroundColor: colors.group, borderColor: colors.border }]}>
      <WorkPaymentAllocation item={item} allocation={allocations.get(item.entry.id)} error={errors.get(item.entry.id)}
        onToggle={() => onToggle(item)} onAmount={value => onAmount(item.entry.id, value)} />
    </View>} />;
}

function WorkPaymentAllocation({ item, allocation, error, onToggle, onAmount }: {
  item: WorkItem; allocation?: Allocation; error?: string; onToggle: () => void; onAmount: (value: string) => void;
}) {
  const colors = useDesignColors();
  const { fontScale } = useWindowDimensions();
  const title = jobTitle(item.entry), balance = formatBrlAmount(item.outstandingMinor);
  return <GroupSurface testID={`work-payment-allocation-${item.entry.id}`} variant="surface"
    style={[styles.row, { borderColor: allocation ? colors.brand : colors.border }]}>
    <UiPressable accessibilityRole="checkbox" accessibilityLabel={`Allocate payment to ${title}`}
      accessibilityHint={`Work ${dateLabel(item.entry.workDate)}. Outstanding ${balance}.`}
      accessibilityState={{ checked: !!allocation }} aria-checked={!!allocation} onPress={onToggle} style={styles.choice}>
      <View style={[styles.workIcon, { backgroundColor: colors.brandSoft }]}><UiIcon name="briefcase" color={colors.brand} size={20} /></View>
      <View style={styles.copy}>
        <UiText type="cardTitle">{title}</UiText>
        <UiText type="secondary" color="textSecondary">Outstanding {balance}</UiText>
        <UiText type="metadata" color="textSecondary">Work {dateLabel(item.entry.workDate)}</UiText>
      </View>
      <View style={[styles.check, { backgroundColor: allocation ? colors.selected : colors.surface, borderColor: allocation ? colors.brand : colors.borderStrong }]}>
        {allocation && <UiIcon name="check" color={colors.brand} size={18} />}
      </View>
    </UiPressable>
    {allocation && <>
      <FormField appearance="v2" label="Amount received for this work *" accessibilityLabel={`Allocation in reais for ${title}`}
        helperText="" error={error} value={allocation.amount} placeholder="0,00"
        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'} onChangeText={onAmount} />
      {(allocation.amount.length > 14 || (fontScale >= 1.4 && allocation.amount.length > 8)) && <UiText testID="work-payment-full-amount" type="numeric" selectable
        accessibilityLabel={`Entered allocation in reais for ${title}: ${allocation.amount}`} style={styles.readable}>{allocation.amount}</UiText>}
    </>}
  </GroupSurface>;
}

export const workPaymentStyles = StyleSheet.create({
  header: { padding: Space.md, gap: Space.sm }, handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm },
  title: { fontSize: 22, lineHeight: 30, textAlign: 'center', maxWidth: '100%' }, heading: { flex: 1, minWidth: 0 },
  before: { gap: Space.md }, allocationHeader: { padding: Space.md, gap: Space.md, borderWidth: 1, borderBottomWidth: 0, borderTopLeftRadius: Shape.group, borderTopRightRadius: Shape.group },
  sectionIdentity: { flexDirection: 'row', alignItems: 'center', gap: Space.md }, icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text: { flex: 1, minWidth: 0 }, stacked: { flexDirection: 'column', alignItems: 'stretch' }, unflex: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  total: { padding: Space.md, gap: Space.sm, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: Shape.group, borderBottomRightRadius: Shape.group },
  after: { gap: Space.md }, number: { minWidth: 0, maxWidth: '100%', fontVariant: ['tabular-nums'] },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm, paddingHorizontal: Space.xs },
  narrowHeading: { fontSize: 18, lineHeight: 26 },
});

const styles = StyleSheet.create({
  content: { padding: Space.md, paddingBottom: Space.lg },
  rowEdge: { borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: Space.md, paddingBottom: Space.sm },
  row: { borderWidth: 1, padding: Space.sm, gap: Space.sm, borderRadius: Shape.control },
  choice: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm, minHeight: TouchTarget, paddingVertical: Space.xs },
  workIcon: { width: 32, height: 36, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  copy: { flex: 1, minWidth: 0, gap: Space.xs },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  readable: { minWidth: 0, maxWidth: '100%' },
});
