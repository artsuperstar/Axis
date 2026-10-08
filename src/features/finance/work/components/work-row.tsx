import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { StatusText } from '@/components/status-text';
import { ControlSize, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateLabel } from '@/utils/calendar';

import { formatBrlAmount } from '../../money';
import { durationLabel } from '../form';
import { jobTitle } from '../presentation';
import type { WorkItem } from '../types';

export function WorkRow({ item, onPress, detail = false }: { item: WorkItem; onPress?: () => void; detail?: boolean }) {
  const colors = useTheme(); const { entry } = item;
  const state = item.overdue ? 'Overdue' : item.outstandingMinor === 0 ? 'Paid' : item.receivedMinor > 0 ? 'Partially paid' : 'Outstanding';
  const content = <>
    <View style={styles.pair}>
      <ThemedText testID="job-title" type="cardTitle" style={styles.name}>{jobTitle(entry)}</ThemedText>
      <ThemedText type="secondary" themeColor={item.outstandingMinor ? 'text' : 'textSecondary'} style={styles.amount}>{item.outstandingMinor ? `${formatBrlAmount(item.outstandingMinor)} outstanding` : `Paid · ${formatBrlAmount(item.earnedMinor)}`}</ThemedText>
    </View>
      <ThemedText testID="job-client" type="secondary" themeColor="textSecondary">{item.counterparty.name}{item.counterparty.deletedAt !== null ? ' · Archived client' : ''}</ThemedText>
      {!!entry.description.trim() && <ThemedText testID="job-description" type="metadata" themeColor="textSecondary" numberOfLines={detail ? undefined : 2}>{entry.description}</ThemedText>}
      <ThemedText type="metadata" themeColor="textSecondary">Work {dateLabel(entry.workDate)}</ThemedText>
      {detail && <>
      <ThemedText type="metadata" themeColor="textSecondary">{entry.compensationType === 'hourly' ? `${durationLabel(entry.durationMinutes!)} × ${formatBrlAmount(entry.hourlyRateMinor!)}/hour` : 'Fixed price'} · Earned</ThemedText>
      <ThemedText type="secondary" themeColor="textSecondary">Received {formatBrlAmount(item.receivedMinor)} · Outstanding {formatBrlAmount(item.outstandingMinor)}</ThemedText>
      </>}
      {!detail && item.receivedMinor > 0 && item.outstandingMinor > 0 && <ThemedText type="secondary" themeColor="textSecondary">{formatBrlAmount(item.outstandingMinor)} outstanding of {formatBrlAmount(item.earnedMinor)} · Received {formatBrlAmount(item.receivedMinor)}</ThemedText>}
    <StatusText tone={item.overdue ? 'attention' : item.outstandingMinor === 0 ? 'subdued' : 'neutral'}>{state}{entry.expectedPaymentDate ? ` · Expected ${dateLabel(entry.expectedPaymentDate)}` : ''}</StatusText>
  </>;
  const style = [styles.row, { borderColor: colors.border }];
  return onPress ? <Pressable testID="work-entry" style={style} accessibilityRole="button"
    accessibilityLabel={`${jobTitle(entry)}, ${item.counterparty.name}, earned ${formatBrlAmount(item.earnedMinor)}, outstanding ${formatBrlAmount(item.outstandingMinor)}, ${state}${entry.expectedPaymentDate ? `, expected ${dateLabel(entry.expectedPaymentDate)}` : ''}`}
    accessibilityHint="Job details and payments" onPress={onPress}>{content}</Pressable>
    : <View style={style}>{content}</View>;
}
const styles = StyleSheet.create({
  row: { paddingVertical: Space.md, gap: Space.sm, borderBottomWidth: 1, minHeight: ControlSize.touch },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }, name: { flexGrow: 1, flexShrink: 1, flexBasis: 160 },
  amount: { flexShrink: 1, fontVariant: ['tabular-nums'] },
});
