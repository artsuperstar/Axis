import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { BackButton } from '@/components/back-button';
import { UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { Shape, TouchTarget } from '@/constants/design-system-v2';

import { formatBrlAmount } from '../../money';
import { commitmentStatusLabel } from '../presentation';
import { commitmentTypeIcon } from '../type-icons';
import { commitmentKindLabels, type CommitmentItem } from '../types';

export function CommitmentHistoryIndexHeader({ onBack }: { onBack: () => void }) {
  return <View style={styles.introduction}>
    <View style={styles.heading}>
      <BackButton appearance="v2" iconOnly accessibilityLabel="Back to Commitments" onPress={onBack} />
      <UiText type="sectionHeading" accessibilityRole="header" style={styles.headingText}>Commitment History</UiText>
    </View>
    <UiText type="secondary" color="textSecondary">Choose a commitment to view its paid and skipped occurrences.</UiText>
  </View>;
}

/** A navigation summary of authoritative lifetime aggregates, never an occurrence. */
export function CommitmentHistoryIndexCard({ item, onOpen }: { item: CommitmentItem; onOpen: () => void }) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const kind = commitmentKindLabels[item.commitment.kind];
  const status = commitmentStatusLabel(item);
  const amount = formatBrlAmount(item.totalPaidMinor);
  // Keep a useful name column; exceptional text and exact totals earn a full row.
  const stacked = width < 360 || fontScale >= 1.5 || item.commitment.title.length > 45 || amount.length > 16;
  return <UiPressable testID="commitment-history-index-card" accessible accessibilityRole="button"
    accessibilityLabel={`History for ${item.commitment.title}`}
    accessibilityValue={{ text: `${kind}, ${status}, ${item.resolvedCount} paid or skipped. Actual paid total ${amount}.` }}
    accessibilityHint="View paid and skipped occurrences."
    onPress={onOpen} style={[styles.card, { backgroundColor: colors.group, borderColor: colors.border }]}>
    <View style={[styles.content, stacked && styles.stacked]}>
      <View style={[styles.identity, stacked && styles.fullWidth]}>
        <View style={[styles.tile, { backgroundColor: colors.brandSoft }]}>
          <UiIcon name={commitmentTypeIcon(item.commitment.kind)} color={colors.brand} size={24} />
        </View>
        <View style={styles.copy}>
          <UiText type="cardTitle">{item.commitment.title}</UiText>
          <UiText type="metadata" color="textSecondary">{kind} · {status}</UiText>
          <UiText type="metadata" color="textSecondary">{item.resolvedCount} paid or skipped</UiText>
        </View>
      </View>
      <View testID="commitment-history-index-total" style={[styles.trailing, stacked && styles.totalBelow]}>
        <UiText type="body" style={styles.amount}>Paid {amount}</UiText>
        <UiIcon name="forward" size={20} color={colors.textSecondary} />
      </View>
    </View>
  </UiPressable>;
}

const styles = StyleSheet.create({
  introduction: { gap: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headingText: { flex: 1, minWidth: 0 },
  card: { borderWidth: 1, borderRadius: Shape.group, padding: 12, minHeight: TouchTarget },
  content: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, flexBasis: 180, flexGrow: 1, flexShrink: 1, maxWidth: '100%' },
  tile: { width: 44, height: 48, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  trailing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 1, maxWidth: '100%', marginLeft: 'auto' },
  amount: { minWidth: 0, maxWidth: '100%', flexShrink: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
  stacked: { flexDirection: 'column', alignItems: 'stretch', flexWrap: 'nowrap' },
  fullWidth: { flexBasis: 'auto', width: '100%', flexGrow: 0, flexShrink: 0 },
  totalBelow: { width: '100%', marginLeft: 0 },
});
