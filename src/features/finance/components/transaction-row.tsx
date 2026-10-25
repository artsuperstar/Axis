import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { ContextMenu } from '@/components/context-menu';
import { UiIcon, UiText, useDesignColors } from '@/components/design-system';
import { Shape, TouchTarget } from '@/constants/design-system-v2';
import { localDateString } from '@/utils/calendar';

import { transactionPresentation } from '../transactions-presentation';
import { financeCategoryIcon } from '../category-icons';
import { overviewColors } from '../overview-presentation';
import type { FinanceCategory, FinanceTransaction, TransactionSource } from '../types';

export function TransactionRow({ transaction, categories, onEdit, onDelete, onViewSource, source, today = localDateString(new Date()) }: {
  transaction: FinanceTransaction;
  categories: FinanceCategory[];
  onEdit: () => void;
  onDelete: () => void;
  onViewSource?: () => void;
  source?: TransactionSource;
  today?: string;
}) {
  const colors = useDesignColors();
  const { fontScale } = useWindowDimensions();
  const finance = overviewColors(colors);
  const display = transactionPresentation(transaction, categories, today, source);
  const linked = !!source;
  return (
    <View testID="transaction-row" style={[styles.row, { borderColor: colors.border, backgroundColor: colors.group }]}>
      <View accessible accessibilityLabel={display.accessibilityLabel} testID="transaction-information" style={[styles.details, fontScale >= 1.5 && styles.stacked]}>
        <View style={[styles.tile, { backgroundColor: colors.brandSoft }]}><UiIcon name={financeCategoryIcon(transaction.categoryId)} color={colors.brand} size={24} /></View>
        <View style={styles.text}>
          <View style={styles.heading}>
            <UiText testID="transaction-description" type="cardTitle" style={[styles.description, { flexBasis: 100 * fontScale }]}>{display.title}</UiText>
            <UiText testID="transaction-amount" type="cardTitle" style={[styles.amount, { color: transaction.type === 'income' ? finance.income : finance.expenses }]}>{display.amount}</UiText>
          </View>
          {(!!display.category || !!display.context) && <UiText type="metadata" color="textSecondary">{[display.category, display.context].filter(Boolean).join(' · ')}</UiText>}
        </View>
      </View>
      <ContextMenu appearance="v2" label={`Transaction options for ${display.title}`} actions={linked ? [
        { label: 'View payment details', accessibilityLabel: `View payment details for ${display.title}`, onPress: onViewSource ?? onEdit },
        ...(source.kind === 'commitment' ? [{ label: 'Delete payment', accessibilityLabel: `Delete payment for ${display.title}`, variant: 'destructive' as const, onPress: onDelete }] : []),
      ] : [
        { label: 'Edit', accessibilityLabel: `Edit ${transaction.description}`, onPress: onEdit },
        { label: 'Delete', accessibilityLabel: `Delete ${transaction.description}`, variant: 'destructive', onPress: onDelete },
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1, borderRadius: Shape.group },
  details: { flex: 1, minWidth: 0, minHeight: TouchTarget, gap: 12, flexDirection: 'row', alignItems: 'center' },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  tile: { width: 40, height: 40, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'flex-start' },
  text: { flex: 1, minWidth: 0, gap: 4 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 12, rowGap: 4 },
  description: { flexGrow: 1, flexShrink: 1, minWidth: 0, maxWidth: '100%' },
  amount: { flexShrink: 1, maxWidth: '100%', fontVariant: ['tabular-nums'] },
});
