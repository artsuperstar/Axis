import { StyleSheet, View } from 'react-native';

import { AdaptiveModal, AdaptiveSheet } from '@/components/adaptive-sheet';
import { UiText } from '@/components/design-system';
import { FormButton } from '@/components/form-controls';
import { Space } from '@/constants/theme';
import { dateLabel } from '@/utils/calendar';

import { transactionPresentation } from '../transactions-presentation';
import type { FinanceCategory, FinanceTransaction, TransactionSource } from '../types';

export function TransactionDetail({ transaction, source, categories, today, onDismiss, onEdit, onOpenSource, visible, onClosed }: {
  transaction: FinanceTransaction; source: TransactionSource; categories: FinanceCategory[]; today: string;
  onDismiss: () => void; onEdit: () => void; onOpenSource: () => void;
  visible: boolean; onClosed: () => void;
}) {
  const display = transactionPresentation(transaction, categories, today, source);
  const work = source.kind === 'work';
  return <AdaptiveModal onDismiss={onDismiss} visible={visible} onClosed={onClosed}>
    <AdaptiveSheet appearance="v2" titleRole="operational" title="Transaction details" onDismiss={onDismiss} contentContainerStyle={styles.content}>
      <View style={styles.summary}>
        <UiText type="cardTitle">{display.title}</UiText>
        {source.kind === 'work' && <UiText type="metadata" color="textSecondary">{source.clientName}</UiText>}
        <UiText type="metadata" color="textSecondary" accessibilityLabel={`Source: ${work ? 'Work' : 'Commitment'}`}>Source: {work ? 'Work' : 'Commitment'}</UiText>
        <UiText type="metric" color={transaction.type === 'income' ? 'financeIncome' : 'financeExpense'}>{display.amount}</UiText>
        <UiText color="textSecondary">{dateLabel(transaction.transactionDate)}</UiText>
        {!!display.category && <UiText type="metadata" color="textSecondary">{display.category}</UiText>}
      </View>
      {source.kind === 'work' && source.jobs.length > 1 && <View style={styles.summary}>
        <UiText type="cardTitle" accessibilityRole="header">Covered jobs</UiText>
        {source.jobs.map((job) => <UiText key={job.id}>{job.title}</UiText>)}
      </View>}
      {!!transaction.note && <View style={styles.summary}>
        <UiText type="cardTitle" accessibilityRole="header">Note</UiText>
        <UiText>{transaction.note}</UiText>
      </View>}
      <FormButton appearance="v2" variant="primary" label={work ? 'Open Work' : 'Open Commitments'} onPress={onOpenSource} />
      <FormButton appearance="v2" label="Edit details" onPress={onEdit} />
    </AdaptiveSheet>
  </AdaptiveModal>;
}

const styles = StyleSheet.create({ content: { padding: Space.lg, gap: Space.xl }, summary: { gap: Space.sm } });
