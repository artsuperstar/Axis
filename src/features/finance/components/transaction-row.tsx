import { Pressable, StyleSheet, View } from 'react-native';

import { FormButton } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateLabel } from '@/utils/calendar';

import { financeCategoryName } from '../form';
import { formatBrlAmount } from '../money';
import { transactionTypeLabels, type FinanceCategory, type FinanceTransaction } from '../types';

export function TransactionRow({ transaction, categories, onEdit, onDelete, commitmentPayment = false }: {
  transaction: FinanceTransaction;
  categories: FinanceCategory[];
  onEdit: () => void;
  onDelete: () => void;
  commitmentPayment?: boolean;
}) {
  const colors = useTheme();
  const category = financeCategoryName(transaction, categories);
  return (
    <View style={[styles.row, { borderColor: colors.backgroundSelected }]}>
      <Pressable accessibilityRole="button" accessibilityHint="Edit this transaction" onPress={onEdit} style={styles.details}>
        <ThemedText>{transaction.description}</ThemedText>
        <ThemedText type="smallBold">{transactionTypeLabels[transaction.type]} · {formatBrlAmount(transaction.amountMinor)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{dateLabel(transaction.transactionDate)}{category ? ` · ${category}` : ''}</ThemedText>
        {commitmentPayment && <ThemedText type="small" themeColor="textSecondary">Commitment payment · Undo in Commitments history</ThemedText>}
        {!!transaction.note && <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>{transaction.note}</ThemedText>}
      </Pressable>
      {!commitmentPayment && <FormButton label="Delete" accessibilityLabel={`Delete ${transaction.description}`} onPress={onDelete} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three, borderBottomWidth: 1 },
  details: { flex: 1, minHeight: 44, gap: Spacing.half },
});
