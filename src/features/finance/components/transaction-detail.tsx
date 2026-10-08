import { StyleSheet, View } from 'react-native';

import { AdaptiveModal, AdaptiveSheet } from '@/components/adaptive-sheet';
import { FormButton } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
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
    <AdaptiveSheet title="Transaction details" onDismiss={onDismiss} contentContainerStyle={styles.content}>
      <View style={styles.summary}>
        <ThemedText type="cardTitle">{display.title}</ThemedText>
        {source.kind === 'work' && <ThemedText type="metadata" themeColor="textSecondary">{source.clientName}</ThemedText>}
        <ThemedText type="metadata" themeColor="textSecondary" accessibilityLabel={`Source: ${work ? 'Work' : 'Commitment'}`}>Source: {work ? 'Work' : 'Commitment'}</ThemedText>
        <ThemedText type="metric" themeColor={transaction.type === 'income' ? 'success' : 'textPrimary'}>{display.amount}</ThemedText>
        <ThemedText themeColor="textSecondary">{dateLabel(transaction.transactionDate)}</ThemedText>
        {!!display.category && <ThemedText type="metadata" themeColor="textSecondary">{display.category}</ThemedText>}
      </View>
      {source.kind === 'work' && source.jobs.length > 1 && <View style={styles.summary}>
        <ThemedText type="cardTitle" accessibilityRole="header">Covered jobs</ThemedText>
        {source.jobs.map((job) => <ThemedText key={job.id}>{job.title}</ThemedText>)}
      </View>}
      {!!transaction.note && <View style={styles.summary}>
        <ThemedText type="cardTitle" accessibilityRole="header">Note</ThemedText>
        <ThemedText>{transaction.note}</ThemedText>
      </View>}
      <FormButton variant="primary" label={work ? 'Open Work' : 'Open Commitments'} onPress={onOpenSource} />
      <FormButton label="Edit details" onPress={onEdit} />
    </AdaptiveSheet>
  </AdaptiveModal>;
}

const styles = StyleSheet.create({ content: { padding: Space.lg, gap: Space.xl }, summary: { gap: Space.sm } });
