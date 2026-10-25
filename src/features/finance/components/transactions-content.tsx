import { ActivityIndicator, Keyboard, SectionList, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { ContextMenu } from '@/components/context-menu';
import { GroupSurface, UiIcon, UiText, useDesignColors } from '@/components/design-system';
import { FormButton, FormField, SegmentedControl } from '@/components/form-controls';
import { floatingAddClearance } from '@/components/floating-add-button';

import { transactionSections } from '../transactions-presentation';
import type { FinanceCategory, FinanceTransaction, TransactionLedgerFilter, TransactionSource } from '../types';
import { TransactionRow } from './transaction-row';

const typeOptions = [{ value: 'all' as const, label: 'All' }, { value: 'expense' as const, label: 'Expenses' }, { value: 'income' as const, label: 'Income' }];

export function TransactionsContent({ transactions, categories, sources, today, filter, ready, error, searching, current, hasMore,
  onType, onQuery, onCategories, onOpen, onDelete, onLoadMore, scrollOffset, onScroll }: {
  transactions: FinanceTransaction[]; categories: FinanceCategory[]; sources: Record<string, TransactionSource>; today: string;
  filter: TransactionLedgerFilter; ready: boolean; error: boolean; searching: boolean; current: boolean; hasMore: boolean;
  onType: (type: TransactionLedgerFilter['type']) => void; onQuery: (query: string) => void; onCategories: () => void;
  onOpen: (transaction: FinanceTransaction) => void; onDelete: (transaction: FinanceTransaction) => void; onLoadMore: () => void;
  scrollOffset: number; onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}) {
  const colors = useDesignColors();
  const filtered = filter.type !== 'all' || !!filter.query.trim();
  return <SectionList testID="transactions-list" style={styles.list} contentContainerStyle={styles.content}
    contentInsetAdjustmentBehavior="never" automaticallyAdjustKeyboardInsets keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled"
    initialNumToRender={12} maxToRenderPerBatch={12} windowSize={7} removeClippedSubviews={false}
    contentOffset={{ x: 0, y: scrollOffset }} onScroll={onScroll} scrollEventThrottle={16}
    stickySectionHeadersEnabled={false} sections={transactionSections(transactions, today)} keyExtractor={transaction => transaction.id}
    ListHeaderComponent={<View style={styles.header}>
      <GroupSurface variant="group" style={[styles.controls, { borderColor: colors.border }]}>
        <View style={styles.filter}><SegmentedControl appearance="v2" showLabel={false} equalWidth={false} label="Transaction type" value={filter.type} options={typeOptions} onChange={onType} /></View>
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <FormField appearance="v2" label="Search transactions" showLabel={false} placeholder="Search transactions…" value={filter.query} onChangeText={onQuery}
              style={styles.searchInput} autoCorrect={false} autoCapitalize="none" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
            <View pointerEvents="none" style={styles.searchIcon}><UiIcon name="search" size={20} color={colors.textMuted} /></View>
          </View>
          <ContextMenu appearance="v2" label="Transactions options" disabled={!ready} actions={[{ label: 'Categories', onPress: onCategories }]} />
        </View>
        {!!filter.query && <FormButton appearance="v2" variant="quiet" label="Clear search" onPress={() => onQuery('')} />}
      </GroupSurface>
      {(searching || (ready && !current)) && <UiText type="metadata" color="textSecondary" accessibilityLiveRegion="polite">
        {searching ? 'Updating transactions…' : 'Showing previous results. Retry to update the list.'}
      </UiText>}
    </View>}
    ListEmptyComponent={!ready ? (error ? undefined : <ActivityIndicator color={colors.brand} accessibilityLabel="Loading transactions" />)
      : current && !searching ? <View style={styles.empty}>
        <UiText type="cardTitle">{filtered ? 'No matching transactions' : 'No transactions yet'}</UiText>
        <UiText type="secondary" color="textSecondary">{filtered ? 'Try another search or choose All transaction types.' : 'Actual income received and expenses paid will appear here.'}</UiText>
      </View> : undefined}
    renderSectionHeader={({ section }) => <UiText type="smallLabel" color="textSecondary" accessibilityRole="header" style={styles.date}>{section.title}</UiText>}
    renderItem={({ item }) => <TransactionRow transaction={item} categories={categories} today={today} source={sources[item.id]} onViewSource={() => onOpen(item)} onEdit={() => onOpen(item)} onDelete={() => onDelete(item)} />}
    ItemSeparatorComponent={RowSeparator}
    ListFooterComponent={hasMore ? <View style={styles.footer}><FormButton appearance="v2" variant="quiet" label="Load older transactions" disabled={!current || searching} onPress={onLoadMore} /></View> : undefined} />;
}

function RowSeparator() { return <View style={styles.separator} />; }
const styles = StyleSheet.create({
  list: { flex: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 16, paddingBottom: floatingAddClearance, flexGrow: 1 },
  header: { gap: 8 },
  controls: { padding: 12, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  filter: { flexGrow: 1, flexShrink: 1, flexBasis: 240, minWidth: 0 },
  searchRow: { flexGrow: 1, flexShrink: 1, flexBasis: 260, minWidth: 0, flexDirection: 'row', gap: 8, alignItems: 'center' },
  search: { flex: 1, minWidth: 0 }, searchInput: { paddingLeft: 40 }, searchIcon: { position: 'absolute', left: 12, top: 0, bottom: 0, justifyContent: 'center' },
  date: { paddingTop: 20, paddingBottom: 8 }, separator: { height: 8 }, footer: { paddingTop: 16 }, empty: { paddingVertical: 24, gap: 8 },
});
