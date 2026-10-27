import { useCallback, type Ref } from 'react';
import { SectionList, StyleSheet, View, useWindowDimensions, type ScrollViewInstance, type ScrollViewProps } from 'react-native';

import { AdaptiveSheet, useSheetScrollProps } from '@/components/adaptive-sheet';
import { BackButton } from '@/components/back-button';
import { ContextMenu, type ContextMenuAction } from '@/components/context-menu';
import { DesignProvider, GroupSurface, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { FormError } from '@/components/form-controls';
import { FormScrollView } from '@/components/form-selection-host';
import { DesignSpace as Space, Shape } from '@/constants/design-system-v2';
import { dateLabel } from '@/utils/calendar';

import { financeCategoryName } from '../../form';
import { formatBrlAmount } from '../../money';
import type { FinanceCategory } from '../../types';
import type { CommitmentHistory } from '../data';
import { commitmentStatusLabel } from '../presentation';
import { commitmentTypeIcon } from '../type-icons';
import { commitmentKindLabels, type CommitmentSchedule, type DisplayOccurrence } from '../types';
import { CommitmentCard } from './commitment-card';

type Props = {
  data: CommitmentHistory; pending: DisplayOccurrence[]; focused: boolean; categories: FinanceCategory[]; today: string;
  actions: ContextMenuAction[]; error: string | null; onDismiss: () => void; onHistory: () => void;
  onPay: (row: DisplayOccurrence) => void; onSkip: (row: DisplayOccurrence) => void; onViewSeries: () => void;
};

/** Visual ownership only: all versions, obligations, totals and actions are supplied by existing sources. */
export function CommitmentDetails(props: Props) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const stackHeader = width < 390 || fontScale >= 1.5;
  return <DesignProvider><AdaptiveSheet appearance="v2" fillHeight header={<View style={styles.header}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
    {stackHeader && <UiText type="editorTitle" accessibilityRole="header" style={styles.heading}>Commitment details</UiText>}
    <View style={styles.headerRow}>
      <BackButton appearance="v2" iconOnly onPress={props.onDismiss} />
      {!stackHeader && <UiText type="editorTitle" accessibilityRole="header" style={[styles.heading, styles.headerTitle]}>Commitment details</UiText>}
      <View style={styles.menu}><ContextMenu appearance="v2" label={`Series options for ${props.data.commitment.title}`} actions={props.actions} /></View>
    </View>
  </View>} scrollBody={<DetailsList {...props} />} /></DesignProvider>;
}

type DetailsRow = { key: string; version: CommitmentSchedule; occurrence?: never } | { key: string; occurrence: DisplayOccurrence; version?: never };
function DetailsList({ data, pending, focused, categories, today, error, onHistory, onPay, onSkip, onViewSeries }: Props) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const { ref: sheetRef, ...scrollProps } = useSheetScrollProps();
  const stacked = width < 390 || fontScale >= 1.5;
  const category = financeCategoryName({ type: 'expense', categoryId: data.commitment.categoryId }, categories);
  const openSchedule = data.commitment.status === 'active' && data.schedule.effectiveUntil === null;
  const sections = [
    { key: 'schedules', title: 'Schedules', data: data.versions.map(version => ({ key: `schedule:${version.id}`, version } as DetailsRow)) },
    { key: 'unpaid', title: focused ? 'Selected obligation' : 'Unpaid occurrences', data: pending.map(occurrence => ({ key: `due:${occurrence.id ?? `${occurrence.scheduleId}:${occurrence.dueDate}`}`, occurrence } as DetailsRow)) },
  ];
  const metrics = [
    { label: data.commitment.kind === 'installment' ? 'Expected per installment' : 'Expected', value: formatBrlAmount(data.commitment.expectedAmountMinor), numeric: true },
    { label: 'Category', value: category || 'No category' },
    { label: openSchedule ? 'Frequency' : 'Latest schedule frequency', value: `Monthly on day ${data.schedule.billingDay}`, full: true },
    { label: openSchedule ? 'Current schedule starts' : 'Latest schedule starts', value: dateLabel(data.schedule.startDate) },
    { label: 'Total paid', value: formatBrlAmount(data.totalPaidMinor), numeric: true },
    ...(data.commitment.installmentCount === null ? [] : [{ label: 'Installments resolved', value: `${data.resolvedCount} of ${data.commitment.installmentCount} paid or skipped`, full: true }]),
  ];
  return <SectionList<DetailsRow> {...scrollProps} testID="commitment-details-list" sections={sections} keyExtractor={row => row.key}
    initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5} removeClippedSubviews={false} stickySectionHeadersEnabled={false}
    renderScrollComponent={props => <DetailsScrollView {...props} sheetRef={sheetRef} />}
    keyboardDismissMode="on-drag" contentContainerStyle={styles.content}
    ListHeaderComponent={<View>
      <FormError appearance="v2" message={error} />
      <GroupSurface testID="commitment-details-overview" style={[styles.overview, { borderColor: colors.border }]}>
        <View style={[styles.identity, fontScale >= 1.5 && styles.stack]}>
          <View style={[styles.typeTile, { backgroundColor: colors.brandSoft }]}><UiIcon name={commitmentTypeIcon(data.commitment.kind)} color={colors.brand} size={24} /></View>
          <View style={[styles.identityText, fontScale >= 1.5 && styles.full]}>
            <UiText type="editorSection">{data.commitment.title}</UiText>
            <UiText type="metadata" color="textSecondary">{commitmentKindLabels[data.commitment.kind]} · <UiText type="metadata" color={data.commitment.status === 'paused' ? 'attention' : data.commitment.status === 'active' ? 'brand' : 'textSecondary'}>{commitmentStatusLabel(data)}</UiText></UiText>
          </View>
        </View>
        <View style={styles.metrics}>{metrics.map(metric => <View key={metric.label} testID={`commitment-metric-${metric.label}`} style={[styles.metric, (stacked || metric.full || (metric.numeric && metric.value.length > 16)) && styles.full]}>
          <UiText type="metadata" color="textSecondary">{metric.label}</UiText>
          <UiText type={metric.numeric ? 'numeric' : 'body'}>{metric.value}</UiText>
        </View>)}</View>
      </GroupSurface>
    </View>}
    renderSectionHeader={({ section }) => <UiText type="editorSection" accessibilityRole="header" style={styles.sectionHeading}>{section.title}</UiText>}
    renderItem={({ item: row, index, section }) => row.version ? <View testID="commitment-schedule-row" accessible
      accessibilityLabel={`From ${dateLabel(row.version.startDate)}. Effective from ${dateLabel(row.version.effectiveFrom)}. Day ${row.version.billingDay}. Expected ${formatBrlAmount(row.version.expectedAmountMinor)}. ${scheduleBoundary(row.version, data)}.`}
      style={[styles.scheduleRow, { backgroundColor: colors.group, borderColor: colors.border }, index === 0 && styles.scheduleFirst, index === section.data.length - 1 && styles.scheduleLast]}>
      <View style={[styles.scheduleTile, { backgroundColor: colors.brandSoft }]}><UiIcon name="calendar" color={colors.brand} size={20} /></View>
      <View style={styles.scheduleText}>
        <UiText type="body">From {dateLabel(row.version.startDate)}</UiText>
        {row.version.effectiveFrom !== row.version.startDate && <UiText type="metadata" color="textSecondary">Effective from {dateLabel(row.version.effectiveFrom)}</UiText>}
        <UiText type="metadata" color="textSecondary">Day {row.version.billingDay} · {formatBrlAmount(row.version.expectedAmountMinor)}</UiText>
        <UiText type="metadata" color="textSecondary">{scheduleBoundary(row.version, data)}</UiText>
      </View>
    </View> : <View style={styles.obligation}><CommitmentCard item={data} occurrence={row.occurrence} categories={categories} today={today}
      onPay={() => onPay(row.occurrence)} onSkip={() => onSkip(row.occurrence)} onViewSeries={focused ? onViewSeries : undefined} /></View>}
    renderSectionFooter={({ section }) => section.key === 'unpaid' && !pending.length ? <UiText type="metadata" color="textSecondary">No unresolved occurrences in this preview.</UiText> : null}
    ListFooterComponent={<UiPressable testID="commitment-details-history" accessibilityRole="button" accessibilityLabel="View history" accessibilityHint="View paid and skipped occurrences and earlier history." onPress={onHistory}
      style={[styles.history, { backgroundColor: colors.group, borderColor: colors.border }]}>
      <UiIcon name="clock" color={colors.textSecondary} size={22} /><UiText type="body" style={styles.historyText}>View history</UiText><UiIcon name="forward" color={colors.textSecondary} size={20} />
    </UiPressable>} />;
}

function scheduleBoundary(version: CommitmentSchedule, data: CommitmentHistory) {
  if (version.effectiveUntil) return `Ends before ${dateLabel(version.effectiveUntil)}`;
  return data.commitment.status === 'active' ? 'Current' : data.commitment.status === 'completed' ? 'Completed schedule' : 'Latest schedule';
}

function DetailsScrollView({ sheetRef, ref, ...props }: ScrollViewProps & { sheetRef: Ref<ScrollViewInstance>; ref?: Ref<ScrollViewInstance> }) {
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
  content: { padding: Space.md, paddingBottom: Space.xl }, overview: { padding: Space.md, gap: Space.lg, borderWidth: 1 },
  identity: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md }, identityText: { flex: 1, minWidth: 0, gap: Space.xs },
  typeTile: { width: 40, height: 40, borderRadius: Shape.group, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md }, metric: { flexGrow: 1, flexShrink: 1, flexBasis: 150, minWidth: 0, maxWidth: '100%', gap: Space.xs },
  full: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' }, stack: { flexDirection: 'column', alignItems: 'stretch' },
  sectionHeading: { paddingTop: Space.xl, paddingBottom: Space.md },
  scheduleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.md, padding: Space.md, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1 },
  scheduleFirst: { borderTopWidth: 1, borderTopLeftRadius: Shape.group, borderTopRightRadius: Shape.group }, scheduleLast: { borderBottomLeftRadius: Shape.group, borderBottomRightRadius: Shape.group },
  scheduleTile: { width: 32, height: 32, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, scheduleText: { flex: 1, minWidth: 0, gap: Space.xs },
  obligation: { paddingBottom: Space.sm }, history: { marginTop: Space.lg, padding: Space.md, borderWidth: 1, borderRadius: Shape.group, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: Space.md }, historyText: { flex: 1, minWidth: 0 },
});
