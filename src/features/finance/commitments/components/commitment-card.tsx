import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { ContextMenu } from '@/components/context-menu';
import { FormButton } from '@/components/form-controls';
import { GroupSurface, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { Shape, TouchTarget } from '@/constants/design-system-v2';
import { dateLabel } from '@/utils/calendar';

import { financeCategoryName } from '../../form';
import { formatBrlAmount } from '../../money';
import type { FinanceCategory } from '../../types';
import { installmentLabel } from '../presentation';
import { occurrenceLabel } from '../scheduling';
import { commitmentTypeIcon } from '../type-icons';
import { commitmentKindLabels, type CommitmentItem, type DisplayOccurrence } from '../types';

/** Main feed only. Existing details, payment confirmation and history keep their UI. */
export function CommitmentCard({ item, occurrence, categories, today, onView, onPay, onSkip, onViewSeries }: {
  item: CommitmentItem; occurrence: DisplayOccurrence; categories: FinanceCategory[]; today: string;
  onView: () => void; onPay: () => void; onSkip: () => void; onViewSeries: () => void;
}) {
  const colors = useDesignColors();
  const { fontScale } = useWindowDimensions();
  const state = occurrenceLabel(occurrence.status, occurrence.dueDate, today);
  const installment = installmentLabel(item, occurrence);
  const category = financeCategoryName({ type: 'expense', categoryId: item.commitment.categoryId }, categories);
  const due = occurrence.dueDate === today ? 'Due today' : `Due ${dateLabel(occurrence.dueDate)}`;
  const subject = `${item.commitment.title}, due ${dateLabel(occurrence.dueDate)}`;
  return <GroupSurface testID="commitment-obligation" style={[styles.card, { borderColor: colors.border }]}>
    <View testID="commitment-content" style={[styles.content, fontScale >= 1.5 && styles.stacked]}>
    <View testID="commitment-info" style={[styles.identity, fontScale >= 1.5 && styles.fullWidth]}>
      <View style={[styles.tile, { backgroundColor: colors.brandSoft }]}><UiIcon name={commitmentTypeIcon(item.commitment.kind)} color={colors.brand} size={24} /></View>
      <UiPressable accessibilityRole="button"
        accessibilityLabel={`${item.commitment.title}, expected ${formatBrlAmount(occurrence.expectedAmountMinor)}, ${state}, due ${dateLabel(occurrence.dueDate)}${installment ? `, installment ${installment}` : ''}, ${commitmentKindLabels[item.commitment.kind]}${category ? `, category ${category}` : ''}${item.commitment.status !== 'active' ? `, commitment ${item.commitment.status}` : ''}`}
        accessibilityHint="View obligation details. Payment requires confirmation." onPress={onView} style={styles.body}>
        <UiText testID="commitment-title" type="cardTitle">{item.commitment.title}</UiText>
        <UiText type="metadata" style={{ color: state === 'Overdue' ? colors.attention : colors.textSecondary }}>
          {[installment, state === 'Overdue' ? `Overdue · ${due}` : due].filter(Boolean).join(' · ')}
        </UiText>
        <UiText type="metadata" color="textSecondary">{[commitmentKindLabels[item.commitment.kind], category].filter(Boolean).join(' · ')}</UiText>
        {item.commitment.status !== 'active' && <UiText type="smallLabel" color="textMuted">Commitment {item.commitment.status}</UiText>}
      </UiPressable>
    </View>
    <View testID="commitment-trailing" style={[styles.trailing, fontScale >= 1.5 && styles.fullWidth]}>
    <UiText testID="commitment-amount" accessible={false} type="cardTitle" style={styles.amount}>{formatBrlAmount(occurrence.expectedAmountMinor)}</UiText>
    <View testID="commitment-actions" style={styles.actions}>
      {occurrence.status === 'pending' && <FormButton appearance="v2" compact variant="primary" label="Pay" accessibilityLabel={`Pay ${subject}`} onPress={onPay} />}
      <ContextMenu appearance="v2" label={`Actions for ${subject}`} actions={[
        ...(occurrence.status === 'pending' ? [{ label: 'Skip', accessibilityLabel: `Skip ${subject}`, onPress: onSkip }] : []),
        { label: 'View commitment', accessibilityLabel: `View ${item.commitment.title} commitment`, onPress: onViewSeries },
      ]} />
    </View>
    </View>
    </View>
  </GroupSurface>;
}

const styles = StyleSheet.create({
  card: { padding: 12, borderWidth: 1 },
  content: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8 },
  // Yoga wraps the trailing column only when its measured amount/controls cannot fit
  // alongside a readable information column. No monetary value has a fixed width.
  identity: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexGrow: 1, flexShrink: 1, flexBasis: 188, maxWidth: '100%' },
  tile: { width: 40, height: 40, borderRadius: Shape.group + 4, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body: { flex: 1, minWidth: 0, minHeight: TouchTarget, gap: 4 },
  trailing: { flexShrink: 1, maxWidth: '100%', alignItems: 'flex-end', gap: 8, marginLeft: 'auto' },
  amount: { maxWidth: '100%', textAlign: 'right', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  stacked: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  fullWidth: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' },
});
