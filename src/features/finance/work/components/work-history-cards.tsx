import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { ContextMenu } from '@/components/context-menu';
import { GroupSurface, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';
import { dateLabel } from '@/utils/calendar';

import { financeCategoryName } from '../../form';
import { formatBrlAmount } from '../../money';
import type { FinanceCategory } from '../../types';
import { jobTitle } from '../presentation';
import type { WorkItem, WorkPayment } from '../types';

/** Display-only grouping retains every source digit, including the centavo pair at large text. */
function HistoryMoney({ value }: { value: number }) {
  const amount = formatBrlAmount(value);
  return amount.length <= 17 ? <UiText type="cardTitle" style={styles.money}>{amount}</UiText>
    : <View testID="history-long-money" accessibilityLabel={amount} style={styles.moneyGroups}>
      {(amount.match(/^R\$\s|\d+\.|\d+,\d{2}$/g) ?? [amount]).map((part, index) => <UiText key={index} testID="history-money-group" type="cardTitle" style={styles.moneyGroup}>{part}</UiText>)}
    </View>;
}

function IdentityIcon({ receipt = false }: { receipt?: boolean }) {
  const colors = useDesignColors();
  return <View style={[styles.icon, { backgroundColor: colors.brandSoft }]}><UiIcon name={receipt ? 'receipt' : 'briefcase'} size={24} color={colors.brand} /></View>;
}

export function WorkHistoryJobCard({ item, onPress }: { item: WorkItem; onPress: () => void }) {
  const colors = useDesignColors(), { width, fontScale } = useWindowDimensions();
  const { entry } = item, title = jobTitle(entry);
  const stack = width < 390 || fontScale >= 1.3 || formatBrlAmount(item.earnedMinor).length > 17;
  return <GroupSurface variant="group" style={[styles.card, { borderColor: colors.border }]}>
    <UiPressable testID="work-entry" accessibilityRole="button" accessibilityLabel={`${title}, ${item.counterparty.name}${item.counterparty.deletedAt !== null ? ', Archived client' : ''}, earned ${formatBrlAmount(item.earnedMinor)}, outstanding ${formatBrlAmount(item.outstandingMinor)}, Paid, Work ${dateLabel(entry.workDate)}${entry.expectedPaymentDate ? `, Expected ${dateLabel(entry.expectedPaymentDate)}` : ''}`}
      accessibilityHint="Job details and payments" onPress={onPress} style={styles.body}>
      <IdentityIcon /><View style={styles.copy}>
        <View style={[styles.identity, stack && styles.stacked]}>
          <View style={[styles.copy, stack && styles.full]}><UiText testID="job-title" type="cardTitle">{title}</UiText>
            <UiText type="secondary" color="textSecondary">{item.counterparty.name}{item.counterparty.deletedAt !== null ? ' · Archived client' : ''}</UiText>
          </View>
          <View testID="history-job-amount" style={styles.balance}><HistoryMoney value={item.earnedMinor} /><UiText testID="history-job-status" type="metadata" color="brand">Paid</UiText></View>
        </View>
        {!!entry.description.trim() && entry.description.trim() !== title && <UiText type="metadata" color="textSecondary" numberOfLines={2}>{entry.description}</UiText>}
        <UiText type="metadata" color="textSecondary">Work {dateLabel(entry.workDate)}</UiText>
        {!!entry.expectedPaymentDate && <UiText type="metadata" color="textSecondary">Expected {dateLabel(entry.expectedPaymentDate)}</UiText>}
      </View>
    </UiPressable>
  </GroupSurface>;
}

export function WorkHistoryReceiptCard({ payment, categories, expanded, onToggle, onUndo, position, count }: {
  payment: WorkPayment; categories: FinanceCategory[]; expanded: boolean; onToggle: () => void; onUndo: () => void;
  position: number; count: number;
}) {
  const colors = useDesignColors(), { width, fontScale } = useWindowDimensions();
  const { transaction, counterparty, allocations } = payment;
  const category = financeCategoryName(transaction, categories), amount = formatBrlAmount(transaction.amountMinor);
  const subject = `${counterparty.name} payment of ${amount}, Received ${dateLabel(transaction.transactionDate)}`;
  const stack = width < 390 || fontScale >= 1.3 || amount.length > 17;
  return <GroupSurface testID="work-receipt" variant="group" style={[styles.card, { borderColor: colors.border }]}>
    <View style={styles.receiptRow}>
      <UiPressable style={styles.body} accessibilityRole="button" accessibilityLabel={`Receipt ${position} of ${count} from ${subject}, ${allocations.length} work ${allocations.length === 1 ? 'entry' : 'entries'}${category ? `, ${category}` : ''}${counterparty.deletedAt !== null ? ', Archived client' : ''}`} accessibilityState={{ expanded }}
        accessibilityHint="View the work covered by this receipt" onPress={onToggle}>
        <IdentityIcon receipt /><View style={styles.copy}>
          <View style={[styles.identity, stack && styles.stacked]}><UiText type="cardTitle" style={[styles.copy, stack && styles.full]}>{counterparty.name}</UiText><HistoryMoney value={transaction.amountMinor} /></View>
          <UiText type="metadata" color="textSecondary">Received {dateLabel(transaction.transactionDate)}</UiText>
          <UiText type="metadata" color="textSecondary">{allocations.length} work {allocations.length === 1 ? 'entry' : 'entries'}{category ? ` · ${category}` : ''}</UiText>
          {counterparty.deletedAt !== null && <UiText type="metadata" color="textSecondary">Archived client</UiText>}
        </View>
      </UiPressable>
      <ContextMenu appearance="v2" label={`Receipt ${position} options for ${subject}`} actions={[{ label: 'Undo payment', accessibilityLabel: `Undo receipt ${position} for ${subject}`, onPress: onUndo }]} />
    </View>
    {expanded && <View testID="history-receipt-allocations" style={[styles.allocations, { borderColor: colors.border }]}>
      <UiText type="metadata" color="textSecondary">Work covered by this receipt</UiText>
      {allocations.map(allocation => <View key={allocation.id} style={styles.allocation}>
        <UiText type="secondary" selectable>{jobTitle(allocation)} · Received </UiText><HistoryMoney value={allocation.amountMinor} />
      </View>)}
    </View>}
  </GroupSurface>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: Space.md, marginBottom: Space.sm }, body: { flex: 1, minWidth: 0, minHeight: TouchTarget, flexDirection: 'row', alignItems: 'flex-start', gap: Space.md },
  icon: { width: 40, height: 44, borderRadius: Shape.control, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: Space.xs }, full: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  identity: { flexDirection: 'row', gap: Space.sm, alignItems: 'flex-start' }, stacked: { flexDirection: 'column', alignItems: 'stretch' }, balance: { gap: Space.xs },
  money: { fontVariant: ['tabular-nums'] }, moneyGroups: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' }, moneyGroup: { flexShrink: 0, fontVariant: ['tabular-nums'] },
  receiptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm }, allocations: { marginTop: Space.sm, borderTopWidth: 1, paddingTop: Space.sm, gap: Space.sm }, allocation: { gap: Space.xs },
});
