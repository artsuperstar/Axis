import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateLabel } from '@/utils/calendar';

import { formatBrlAmount } from '../../money';
import { durationLabel } from '../form';
import type { WorkItem } from '../types';

const statusLabels = { unpaid: 'Unpaid', partial: 'Partially paid', paid: 'Paid' };
export function WorkRow({ item, onPress }: { item: WorkItem; onPress?: () => void }) {
  const colors = useTheme(); const { entry } = item;
  const content = <>
    <ThemedText>{entry.description}</ThemedText>
    <ThemedText type="small" themeColor="textSecondary">{item.counterparty.name} · {dateLabel(entry.workDate)}</ThemedText>
    <ThemedText type="small">{entry.compensationType === 'hourly' ? `${durationLabel(entry.durationMinutes!)} × ${formatBrlAmount(entry.hourlyRateMinor!)}/hour` : 'Fixed'}</ThemedText>
    <ThemedText type="smallBold">{item.earnedMinor === 0 ? 'No payment due' : statusLabels[item.status]}{item.overdue ? ' · Payment overdue' : ''}</ThemedText>
    <ThemedText type="small">Earned {formatBrlAmount(item.earnedMinor)}</ThemedText>
    <ThemedText type="small">Received {formatBrlAmount(item.receivedMinor)}</ThemedText>
    <ThemedText type="smallBold">Outstanding {formatBrlAmount(item.outstandingMinor)}</ThemedText>
    {!!entry.expectedPaymentDate && <ThemedText type="small" themeColor="textSecondary">Expected {dateLabel(entry.expectedPaymentDate)}</ThemedText>}
  </>;
  const style = [styles.card, { backgroundColor: colors.backgroundElement }];
  return onPress ? <Pressable style={style} accessibilityRole="button" accessibilityHint="Work details and payments" onPress={onPress}>{content}</Pressable>
    : <View style={style}>{content}</View>;
}
const styles = StyleSheet.create({ card: { padding: Spacing.three, gap: Spacing.two, borderRadius: Spacing.two, minHeight: 48 } });
