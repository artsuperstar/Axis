import { useCallback, type Ref } from 'react';
import { SectionList, StyleSheet, View, useWindowDimensions, type ScrollViewInstance, type ScrollViewProps } from 'react-native';

import { AdaptiveSheet, useSheetScrollProps } from '@/components/adaptive-sheet';
import { BackButton } from '@/components/back-button';
import { ContextMenu, type ContextMenuAction } from '@/components/context-menu';
import { DesignProvider, GroupSurface, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { FormButton, FormError } from '@/components/form-controls';
import { FormScrollView } from '@/components/form-selection-host';
import { DesignSpace as Space, Shape } from '@/constants/design-system-v2';
import { dateLabel } from '@/utils/calendar';

import { financeCategoryName } from '../../form';
import { formatBrlAmount } from '../../money';
import type { FinanceCategory } from '../../types';
import type { CommitmentHistory as HistoryData } from '../data';
import { commitmentStatusLabel, installmentLabel } from '../presentation';
import { commitmentTypeIcon } from '../type-icons';
import { commitmentKindLabels } from '../types';

type HistoryEntry = HistoryData['history'][number];
type Props = {
  data: HistoryData; categories: FinanceCategory[]; actions: ContextMenuAction[]; error: string | null;
  onDismiss: () => void; onViewCommitment: () => void; onLoadEarlier: () => void; onReopen: (entry: HistoryEntry) => void;
};

/** Individual archive only. Queries, loaded span, action confirmation and persistence stay with the existing owner. */
export function CommitmentHistory(props: Props) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const stack = width < 390 || fontScale >= 1.5;
  return <DesignProvider><AdaptiveSheet appearance="v2" fillHeight header={<View style={styles.header}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
    {stack && <UiText type="editorTitle" accessibilityRole="header" style={styles.heading}>Commitment history</UiText>}
    <View style={styles.headerRow}>
      <BackButton appearance="v2" iconOnly onPress={props.onDismiss} />
      {!stack && <UiText type="editorTitle" accessibilityRole="header" style={[styles.heading, styles.headerTitle]}>Commitment history</UiText>}
      <View style={styles.menu}><ContextMenu appearance="v2" label={`Series options for ${props.data.commitment.title}`} actions={props.actions} /></View>
    </View>
  </View>} scrollBody={<HistoryList {...props} />} /></DesignProvider>;
}

function HistoryList({ data, categories, error, onViewCommitment, onLoadEarlier, onReopen }: Props) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const { ref: sheetRef, ...scrollProps } = useSheetScrollProps();
  const category = financeCategoryName({ type: 'expense', categoryId: data.commitment.categoryId }, categories);
  const rows = data.history.filter(entry => entry.occurrence.status !== 'pending');
  const expectation = data.commitment.kind === 'installment' ? 'Latest expected per installment' : 'Latest expected per occurrence';
  const stacked = width < 390 || fontScale >= 1.5 || formatBrlAmount(data.commitment.expectedAmountMinor).length > 16;
  return <SectionList<HistoryEntry> {...scrollProps} testID="commitment-individual-history-list" sections={[{ key: 'resolved', title: 'Paid and skipped', data: rows }]}
    keyExtractor={entry => entry.occurrence.id} initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5} removeClippedSubviews={false}
    stickySectionHeadersEnabled={false} renderScrollComponent={props => <HistoryScrollView {...props} sheetRef={sheetRef} />}
    keyboardDismissMode="on-drag" contentContainerStyle={styles.content}
    ListHeaderComponent={<View>
      <FormError appearance="v2" message={error} />
      <GroupSurface testID="commitment-history-summary" style={[styles.summary, { borderColor: colors.border }]}>
        <View style={[styles.identity, fontScale >= 1.5 && styles.stack]}>
          <View style={[styles.summaryTile, { backgroundColor: colors.brandSoft }]}><UiIcon name={commitmentTypeIcon(data.commitment.kind)} color={colors.brand} size={24} /></View>
          <View style={[styles.identityText, fontScale >= 1.5 && styles.full]}>
            <UiText type="editorSection">{data.commitment.title}</UiText>
            <UiText type="metadata" color="textSecondary">{commitmentKindLabels[data.commitment.kind]} · {commitmentStatusLabel(data)}</UiText>
          </View>
        </View>
        <View style={styles.summaryMetrics}>
          <View style={[styles.metric, stacked && styles.full]}><UiText type="metadata" color="textSecondary">Category</UiText><UiText type="body">{category || 'No category'}</UiText></View>
          <View style={[styles.metric, stacked && styles.full]} testID="commitment-history-expectation"><UiText type="metadata" color="textSecondary">{expectation}</UiText><UiText type="numeric">{formatBrlAmount(data.commitment.expectedAmountMinor)}</UiText></View>
        </View>
        {data.commitment.installmentCount !== null && <UiText testID="commitment-history-progress" type="metadata" color="textSecondary">{data.resolvedCount} of {data.commitment.installmentCount} installments paid or skipped</UiText>}
      </GroupSurface>
    </View>}
    renderSectionHeader={() => <UiText type="editorSection" accessibilityRole="header" style={styles.sectionHeading}>Paid and skipped</UiText>}
    renderItem={({ item, index }) => <HistoryCard entry={item} data={data} categories={categories} last={index === rows.length - 1} onReopen={() => onReopen(item)} />}
    renderSectionFooter={() => !rows.length ? <UiText type="metadata" color="textSecondary">No paid or skipped occurrences in this page.</UiText> : null}
    ListFooterComponent={<View style={styles.footer}>
      {data.nextBefore && <FormButton appearance="v2" variant="quiet" label="Load earlier history" accessibilityHint="Load the next earlier history page. Existing records remain visible." onPress={onLoadEarlier} />}
      <UiPressable testID="commitment-history-view-commitment" accessibilityRole="button" accessibilityLabel="View commitment" accessibilityHint="Return to this commitment's details." onPress={onViewCommitment}
        style={[styles.navigation, { backgroundColor: colors.group, borderColor: colors.border }]}>
        <UiIcon name="document" color={colors.textSecondary} size={22} /><UiText type="body" style={styles.navigationText}>View commitment</UiText><UiIcon name="forward" color={colors.textSecondary} size={20} />
      </UiPressable>
    </View>} />;
}

function HistoryCard({ entry: { occurrence, payment }, data, categories, last, onReopen }: {
  entry: HistoryEntry; data: HistoryData; categories: FinanceCategory[]; last: boolean; onReopen: () => void;
}) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const paid = occurrence.status === 'paid';
  const expected = formatBrlAmount(occurrence.expectedAmountMinor);
  const actual = payment ? formatBrlAmount(payment.amountMinor) : null;
  const stacked = width < 360 || fontScale >= 1.5 || expected.length > 16 || (actual?.length ?? 0) > 16;
  const sequence = installmentLabel(data, occurrence);
  const state = paid ? 'Paid' : 'Skipped';
  return <View testID="commitment-history-timeline-row" style={styles.timelineRow}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.rail}>
      {!last && <View testID="commitment-history-connector" style={[styles.connector, { backgroundColor: colors.borderStrong }]} />}
      <View testID={paid ? 'commitment-history-paid-marker' : 'commitment-history-skipped-marker'} style={[styles.marker, { backgroundColor: paid ? colors.brandSoft : colors.inset, borderColor: paid ? colors.brand : colors.borderStrong }]}>
        {paid ? <UiIcon name="check" color={colors.brand} size={12} /> : <View style={[styles.minus, { backgroundColor: colors.textSecondary }]} />}
      </View>
    </View>
    <GroupSurface testID="commitment-history-row" style={[styles.card, { borderColor: colors.border }]}>
      <View style={[styles.cardContent, stacked && styles.stack]}>
        <View style={[styles.rowIdentity, stacked && styles.full]}>
          <View style={[styles.rowTile, { backgroundColor: colors.brandSoft }]}><UiIcon name={commitmentTypeIcon(data.commitment.kind)} color={colors.brand} size={20} /></View>
          <View style={styles.rowText}>
            <UiText type="metadata" color={paid ? 'brand' : 'textSecondary'}>{state} · Due {dateLabel(occurrence.dueDate)}{sequence ? ` · ${sequence}` : ''}</UiText>
            <UiText type="metadata" color="textSecondary">Expected {expected}</UiText>
            {paid && payment && <>
              <UiText type="numeric">Paid {actual}</UiText>
              <UiText type="metadata" color="textSecondary">Payment date {dateLabel(payment.transactionDate)}</UiText>
              <UiText type="metadata" color="textSecondary">Category · {financeCategoryName(payment, categories) || 'No category'}</UiText>
            </>}
          </View>
        </View>
        <View style={[styles.rowActions, stacked && styles.full]}>
          <FormButton appearance="v2" compact variant="secondary" label={paid ? 'Undo payment' : 'Reopen'}
            accessibilityLabel={`${paid ? 'Undo payment for' : 'Reopen'} ${data.commitment.title}, due ${dateLabel(occurrence.dueDate)}`}
            accessibilityHint={paid ? 'Ask to remove the linked Expense and return this occurrence to unpaid.' : 'Ask to return this skipped occurrence to unpaid.'} onPress={onReopen} />
        </View>
      </View>
    </GroupSurface>
  </View>;
}

function HistoryScrollView({ sheetRef, ref, ...props }: ScrollViewProps & { sheetRef: Ref<ScrollViewInstance>; ref?: Ref<ScrollViewInstance> }) {
  const attach = useCallback((node: ScrollViewInstance | null) => {
    for (const target of [sheetRef, ref]) {
      if (typeof target === 'function') target(node);
      else if (target) target.current = node;
    }
  }, [sheetRef, ref]);
  return <FormScrollView {...props} ref={attach} />;
}

const styles = StyleSheet.create({
  header: { padding: Space.md, gap: Space.sm }, handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm }, heading: { fontSize: 22, lineHeight: 30, textAlign: 'center' }, headerTitle: { flex: 1, minWidth: 0 }, menu: { marginLeft: 'auto' },
  content: { padding: Space.md, paddingBottom: Space.xl }, summary: { padding: Space.md, gap: Space.md, borderWidth: 1 },
  identity: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md }, identityText: { flex: 1, minWidth: 0, gap: Space.xs },
  summaryTile: { width: 40, height: 40, borderRadius: Shape.group, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  summaryMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md }, metric: { flexGrow: 1, flexShrink: 1, flexBasis: 150, minWidth: 0, maxWidth: '100%', gap: Space.xs },
  sectionHeading: { paddingTop: Space.xl, paddingBottom: Space.md }, stack: { flexDirection: 'column', alignItems: 'stretch' }, full: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' },
  timelineRow: { flexDirection: 'row', alignItems: 'stretch', gap: Space.sm, paddingBottom: Space.sm }, rail: { width: 18, alignItems: 'center', flexShrink: 0, position: 'relative' },
  marker: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, marginTop: Space.md, alignItems: 'center', justifyContent: 'center' }, minus: { width: 8, height: 2 }, connector: { position: 'absolute', width: 1, top: 30, bottom: -8 },
  card: { flex: 1, minWidth: 0, padding: Space.md, borderWidth: 1 }, cardContent: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: Space.sm },
  rowIdentity: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm, flexGrow: 1, flexShrink: 1, flexBasis: 172, maxWidth: '100%' },
  rowTile: { width: 28, height: 28, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, rowText: { flex: 1, minWidth: 0, gap: Space.xs },
  rowActions: { flexShrink: 1, maxWidth: '100%', marginLeft: 'auto', alignItems: 'flex-end' },
  footer: { gap: Space.sm, paddingTop: Space.md }, navigation: { borderWidth: 1, borderRadius: Shape.group, minHeight: 56, padding: Space.md, flexDirection: 'row', alignItems: 'center', gap: Space.md }, navigationText: { flex: 1, minWidth: 0 },
});
