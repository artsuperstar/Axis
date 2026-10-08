import { Pressable, StyleSheet, View } from 'react-native';

import { ContextMenu } from '@/components/context-menu';
import { ThemedText } from '@/components/themed-text';
import { ControlSize, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { localDateString } from '@/utils/calendar';

import { transactionPresentation } from '../transactions-presentation';
import type { FinanceCategory, FinanceTransaction, TransactionSource } from '../types';

export function TransactionRow({ transaction, categories, onEdit, onDelete, source, today = localDateString(new Date()) }: {
  transaction: FinanceTransaction;
  categories: FinanceCategory[];
  onEdit: () => void;
  onDelete: () => void;
  source?: TransactionSource;
  today?: string;
}) {
  const colors = useTheme();
  const display = transactionPresentation(transaction, categories, today, source);
  const linked = !!source;
  return (
    <View testID="transaction-row" style={[styles.row, { borderColor: colors.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={display.accessibilityLabel}
        accessibilityHint={linked ? 'Transaction details and source ownership' : 'Edit this transaction'} onPress={onEdit} style={styles.details}>
        <View style={styles.heading}>
          <ThemedText testID="transaction-description" type="cardTitle" style={styles.description}>{display.title}</ThemedText>
          <ThemedText testID="transaction-amount" type="cardTitle" themeColor={transaction.type === 'income' ? 'success' : 'textPrimary'} style={styles.amount}>{display.amount}</ThemedText>
        </View>
        {!!display.category && <ThemedText type="metadata" themeColor="textSecondary">{display.category}</ThemedText>}
        {!!display.context && <ThemedText type="metadata" themeColor="textSecondary">{display.context}</ThemedText>}
      </Pressable>
      {!linked && <ContextMenu label={`Transaction options for ${transaction.description}`} actions={[
        { label: 'Edit', accessibilityLabel: `Edit ${transaction.description}`, onPress: onEdit },
        { label: 'Delete', accessibilityLabel: `Delete ${transaction.description}`, variant: 'destructive', onPress: onDelete },
      ]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingVertical: Space.md, borderBottomWidth: 1 },
  details: { flex: 1, minWidth: 0, minHeight: ControlSize.touch, gap: Space.xs },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: Space.sm },
  description: { flexGrow: 1, flexShrink: 1, flexBasis: 160 },
  amount: { flexShrink: 1, fontVariant: ['tabular-nums'] },
});
