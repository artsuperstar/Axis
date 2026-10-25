import { useCallback, useRef, useState, type Ref } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View, useWindowDimensions, type ScrollViewInstance, type ScrollViewProps } from 'react-native';

import { AdaptiveModal, AdaptiveSheet, useSheetScrollProps } from '@/components/adaptive-sheet';
import { BackButton } from '@/components/back-button';
import { ContextMenu } from '@/components/context-menu';
import { DesignProvider, GroupSurface, UiIcon, UiText, useDesignColors } from '@/components/design-system';
import { FormButton, FormError, FormField, SegmentedControl } from '@/components/form-controls';
import { FormScrollView } from '@/components/form-selection-host';
import { DesignSpace as Space, Shape } from '@/constants/design-system-v2';

import { financeCategoryIcon } from '../category-icons';
import { financeError } from '../errors';
import { transactionTypeOptions } from '../form-options';
import type { FinanceCategory, TransactionType } from '../types';

type Props = {
  categories: FinanceCategory[];
  onCreate: (name: string, type: TransactionType) => FinanceCategory;
  onDelete: (id: string) => void;
  onDismiss: () => void;
  categoriesReady?: boolean;
};
const originOptions = [{ value: 'builtIn', label: 'Built-in' }, { value: 'custom', label: 'Custom' }] as const;
const archiveOptions = [{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }] as const;

export function FinanceCategoryManager(props: Props) {
  const { fontScale } = useWindowDimensions();
  return <DesignProvider><AdaptiveModal onDismiss={props.onDismiss}>
    <AdaptiveSheet appearance="v2" fillHeight header={<View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.back}><BackButton appearance="v2" iconOnly accessibilityLabel="Back to Transactions" onPress={props.onDismiss} /></View>
        {fontScale < 1.5 && <CategoryHeading />}
      </View>
    </View>} scrollBody={<CategoryLibrary {...props} />} />
  </AdaptiveModal></DesignProvider>;
}

function CategoryHeading() {
  const { width, fontScale } = useWindowDimensions();
  return <View style={[styles.headerText, fontScale >= 1.5 && styles.unflex]}>
    <UiText type="editorTitle" accessibilityRole="header" style={{ fontSize: width < 390 ? 24 : 26, lineHeight: 34 }}>Finance categories</UiText>
    <UiText type="secondary" color="textSecondary">Manage the categories for your transactions.</UiText>
  </View>;
}

function CategoryLibrary({ categories, onCreate, onDelete, categoriesReady = true }: Props) {
  const colors = useDesignColors();
  const { fontScale } = useWindowDimensions();
  const { ref: sheetRef, ...scrollProps } = useSheetScrollProps();
  const [type, setType] = useState<TransactionType>('expense');
  const [name, setName] = useState('');
  const [origin, setOrigin] = useState<'builtIn' | 'custom'>('builtIn');
  const [archive, setArchive] = useState<'active' | 'archived'>('active');
  const [nameError, setNameError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const submitting = useRef(false);
  // Preserve the data service's stable name/ID ordering. These are presentation
  // filters over its historical category collection, never domain mutations.
  const visible = categories.filter(category => category.type === type && (origin === 'builtIn' ? category.isBuiltIn && category.deletedAt === null
    : !category.isBuiltIn && (archive === 'archived' ? category.deletedAt !== null : category.deletedAt === null)));
  const hasArchived = categories.some(category => category.type === type && !category.isBuiltIn && category.deletedAt !== null);
  const edge = { backgroundColor: colors.group, borderColor: colors.border };

  function create() {
    if (submitting.current || !categoriesReady) return;
    submitting.current = true;
    try {
      const created = onCreate(name, type);
      setName(''); setNameError(null); setActionError(null); setOrigin('custom'); setArchive('active');
      setFeedback(`Created “${created.name}”.`);
      // Guard until the next user draft, including two submit events in one render.
    } catch (cause) {
      submitting.current = false;
      setNameError(financeError(cause, 'Unable to create this category. Please try again.'));
    }
  }

  function remove(category: FinanceCategory) {
    Alert.alert('Archive category?', `Existing transactions will keep “${category.name}” as their category. It will no longer appear in category choices.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: () => {
        try { onDelete(category.id); setActionError(null); setFeedback(`Archived “${category.name}”.`); }
        catch (cause) { setActionError(financeError(cause, 'Unable to archive this category. Please try again.')); }
      } },
    ]);
  }

  // One virtualized scroller owns both sections. Compose the library border across
  // header/rows/footer rather than nesting an eager collection in a ScrollView.
  return <FlatList {...scrollProps} testID="finance-category-list" data={visible} keyExtractor={category => category.id}
    initialNumToRender={8} maxToRenderPerBatch={8} windowSize={5} removeClippedSubviews={false}
    renderScrollComponent={props => <CategoryScrollView {...props} sheetRef={sheetRef} />}
    keyboardDismissMode="on-drag" contentContainerStyle={styles.content}
    ListHeaderComponent={<View>
      {fontScale >= 1.5 && <View style={styles.scrollHeading}><CategoryHeading /></View>}
      <GroupSurface testID="finance-category-create" style={[styles.create, { borderColor: colors.border }]}>
        <UiText type="editorSection" accessibilityRole="header">New category</UiText>
        <SegmentedControl appearance="v2" equalWidth={false} label="Type *" options={transactionTypeOptions} value={type} onChange={value => {
          setType(value); setNameError(null); setFeedback(null); submitting.current = false;
        }} />
        <FormField appearance="v2" label="Category name *" accessibilityLabel="Category name, required" placeholder="e.g. Travel, Groceries, Subscriptions"
          value={name} error={nameError} onChangeText={value => { setName(value); setNameError(null); setFeedback(null); submitting.current = false; }}
          returnKeyType="done" onSubmitEditing={create} />
        <FormButton appearance="v2" variant="primary" label="Create category" onPress={create} disabled={!name.trim() || !categoriesReady} />
        {!!feedback && <UiText testID="finance-category-feedback" type="secondary" color="textSecondary" accessibilityLiveRegion="polite">{feedback}</UiText>}
      </GroupSurface>
      <View testID="finance-category-library" style={[styles.libraryHeader, edge]}>
        <UiText type="editorSection" accessibilityRole="header">Categories</UiText>
        <UiText type="metadata" color="textSecondary">{type === 'expense' ? 'Expense' : 'Income'} categories</UiText>
        <SegmentedControl appearance="v2" equalWidth={false} label="Category origin" showLabel={false} options={originOptions} value={origin} onChange={setOrigin} />
        {origin === 'custom' && <SegmentedControl appearance="v2" equalWidth={false} label="Custom category status" showLabel={false} options={archiveOptions} value={archive} onChange={setArchive} />}
        <FormError appearance="v2" message={actionError} />
      </View>
    </View>}
    ListEmptyComponent={<View style={[styles.rowWrap, edge]}>
      {categoriesReady ? <View style={styles.empty}>
        <UiText type="cardTitle">{origin === 'builtIn' ? 'No built-in categories.' : archive === 'archived' ? 'No archived categories.' : hasArchived ? 'No active custom categories.' : 'No custom categories yet.'}</UiText>
        {origin === 'custom' && archive === 'active' && <UiText type="secondary" color="textSecondary">Create a category above to organize your transactions.</UiText>}
      </View> : <ActivityIndicator color={colors.brand} accessibilityLabel="Loading Finance categories" />}
    </View>}
    renderItem={({ item }) => <View style={[styles.rowWrap, edge]}>
      <View testID={`finance-category-${item.id}`} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.control }]}>
        <View accessible accessibilityLabel={`${item.name}, ${item.type === 'expense' ? 'Expense' : 'Income'}, ${item.isBuiltIn ? 'Built-in' : item.deletedAt === null ? 'Custom' : 'Custom, Archived'}`}
          style={[styles.identity, fontScale >= 1.5 && styles.stacked]}>
          <View style={[styles.tile, { backgroundColor: item.deletedAt === null ? colors.brandSoft : colors.inset }]}>
            <UiIcon name={financeCategoryIcon(item.id)} size={24} color={item.deletedAt === null ? colors.brand : colors.textMuted} />
          </View>
          <View style={[styles.text, fontScale >= 1.5 && styles.unflex]}>
            <UiText type="cardTitle" testID="finance-category-name">{item.name}</UiText>
            <UiText type="metadata" color="textSecondary">{item.isBuiltIn ? 'Built-in' : item.deletedAt === null ? 'Custom' : 'Custom · Archived'}</UiText>
          </View>
        </View>
        {!item.isBuiltIn && item.deletedAt === null && <ContextMenu appearance="v2" label={`Category options for ${item.name}`} actions={[
          { label: 'Archive category', accessibilityLabel: `Archive ${item.name} category`, variant: 'destructive', onPress: () => remove(item) },
        ]} />}
      </View>
    </View>}
    ListFooterComponent={<View style={[styles.libraryEnd, edge]} />} />;
}

function CategoryScrollView({ sheetRef, ref, ...props }: ScrollViewProps & { sheetRef: Ref<ScrollViewInstance>; ref?: Ref<ScrollViewInstance> }) {
  const attach = useCallback((node: ScrollViewInstance | null) => {
    for (const target of [sheetRef, ref]) {
      if (typeof target === 'function') target(node);
      else if (target) target.current = node;
    }
  }, [sheetRef, ref]);
  return <FormScrollView {...props} ref={attach} />;
}

const styles = StyleSheet.create({
  header: { padding: Space.md, paddingBottom: Space.sm }, headerRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  back: { alignSelf: 'flex-start' }, headerText: { flex: 1, minWidth: 0, gap: 4 }, scrollHeading: { paddingBottom: Space.md }, content: { padding: Space.md, paddingTop: Space.sm },
  create: { padding: Space.md, gap: Space.md, borderWidth: 1, marginBottom: Space.md },
  libraryHeader: { padding: Space.md, gap: Space.sm, borderWidth: 1, borderBottomWidth: 0, borderTopLeftRadius: Shape.group, borderTopRightRadius: Shape.group },
  rowWrap: { paddingHorizontal: Space.md, paddingTop: 8, borderLeftWidth: 1, borderRightWidth: 1 },
  libraryEnd: { height: Space.md, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: Shape.group, borderBottomRightRadius: Shape.group },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: Shape.control, padding: 10 },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { width: 40, height: 40, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text: { flex: 1, minWidth: 0, gap: 2 }, stacked: { flexDirection: 'column', alignItems: 'stretch' }, unflex: { flex: 0 },
  empty: { gap: 8, paddingVertical: Space.md },
});
