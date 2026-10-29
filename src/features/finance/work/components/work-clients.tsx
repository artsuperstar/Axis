import { useMemo, useRef, useState } from 'react';
import { Keyboard, SectionList, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { ContextMenu } from '@/components/context-menu';
import { GroupSurface, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { EditorSection } from '@/components/editor-section';
import { FormButton, FormError, FormField } from '@/components/form-controls';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';
import { canonicalSearchText } from '@/utils/text-normalization';

import { financeError } from '../../errors';
import { formatBrlAmount } from '../../money';
import type { WorkCounterparty, WorkOverview } from '../types';

type Props = {
  data: WorkOverview; error: string | null; onCreate: (name: string) => WorkCounterparty;
  onOpen: (id: string) => void; onHistory: (id: string) => void; onArchive: (id: string) => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};
type ClientSection = { key: string; title: string; archived: boolean; count: number; data: WorkCounterparty[] };

/** One client collection scroll, source-owned balances, and an on-demand creation draft. */
export function WorkClientsList({ data, error, onCreate, onOpen, onHistory, onArchive, onScroll }: Props) {
  const colors = useDesignColors();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 390 || fontScale >= 1.3;
  const [search, setSearch] = useState(''), [expanded, setExpanded] = useState(true), [creating, setCreating] = useState(false);
  const [name, setName] = useState(''), [nameError, setNameError] = useState<string | null>(null), [created, setCreated] = useState<string | null>(null);
  const submitted = useRef(false);
  const totals = useMemo(() => new Map(data.counterpartyTotals.map(group => [group.counterparty.id, group.outstandingMinor])), [data.counterpartyTotals]);
  const query = canonicalSearchText(search);
  const sections: ClientSection[] = [false, true].map(archived => {
    const collection = data.counterparties.filter(party => (party.deletedAt !== null) === archived);
    return { key: archived ? 'archived' : 'active', title: archived ? 'Archived clients' : 'Active clients', archived, count: collection.length,
      data: archived && !expanded ? [] : collection.filter(party => canonicalSearchText(party.name).includes(query)) };
  });
  function create() {
    if (submitted.current) return;
    submitted.current = true;
    try {
      const client = onCreate(name);
      setCreated(client.name); setName(''); setNameError(null); setCreating(false); Keyboard.dismiss();
    } catch (cause) { submitted.current = false; setNameError(financeError(cause, 'Unable to create client. Please try again.')); }
  }
  return <SectionList<WorkCounterparty, ClientSection> testID="work-clients-list" style={styles.list} contentContainerStyle={styles.content}
    sections={sections} keyExtractor={party => party.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={5}
    stickySectionHeadersEnabled={false} removeClippedSubviews={false} contentInsetAdjustmentBehavior="never" automaticallyAdjustKeyboardInsets
    keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onScroll={onScroll} scrollEventThrottle={16}
    ListHeaderComponent={<View testID="work-clients-content" style={styles.header}>
      <View style={styles.search}>
        <FormField appearance="v2" label="Search clients" showLabel={false} placeholder="Search clients…" autoCorrect={false} autoCapitalize="none"
          value={search} onChangeText={value => { setSearch(value); if (value) setExpanded(true); }} style={[styles.searchInput, { minHeight: TouchTarget * fontScale }]} returnKeyType="search" onSubmitEditing={Keyboard.dismiss} />
        <View style={styles.searchIcon} pointerEvents="none"><UiIcon name="search" size={20} color={colors.textSecondary} /></View>
      </View>
      {!!search && <FormButton appearance="v2" variant="quiet" label="Clear search" onPress={() => setSearch('')} />}
      <FormError appearance="v2" message={error} />
      {!!created && <UiText type="secondary" color="textSecondary" accessibilityLiveRegion="polite">Client created: {created}{query ? '. Clear search to browse all clients.' : '.'}</UiText>}
      {creating ? <EditorSection title="New client" icon="person" description="Create a client for Work." variant="group">
        <FormField appearance="v2" label="Name *" placeholder="Enter a client name" value={name} error={nameError} autoCapitalize="words" autoCorrect={false} style={{ minHeight: TouchTarget * fontScale }}
          onChangeText={value => { setName(value); setNameError(null); submitted.current = false; }} returnKeyType="done" onSubmitEditing={create} />
        <View style={[styles.actions, stacked && styles.stacked]}>
          <FormButton appearance="v2" variant="quiet" label="Cancel" accessibilityLabel="Cancel new client" onPress={() => { setCreating(false); setName(''); setNameError(null); Keyboard.dismiss(); }} />
          <FormButton appearance="v2" variant="primary" label="Create client" onPress={create} />
        </View>
      </EditorSection> : <GroupSurface testID="new-client-entry" variant="group" style={[styles.newClient, { borderColor: colors.border, flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'stretch' : 'center' }]}>
        <View style={[styles.introduction, !stacked && styles.grow]}><View style={[styles.icon, { backgroundColor: colors.brandSoft }]}><UiIcon name="person" size={24} color={colors.brand} /></View>
          <View style={styles.copy}><UiText type="editorSection">Add a new client</UiText><UiText type="secondary" color="textSecondary">Create a client to start recording work and payments.</UiText></View>
        </View>
        <View style={stacked ? styles.full : undefined}><FormButton appearance="v2" variant="primary" label="New client" onPress={() => { setCreating(true); setCreated(null); submitted.current = false; }} /></View>
      </GroupSurface>}
    </View>}
    renderSectionHeader={({ section }) => section.archived ? <UiPressable testID="archived-clients-disclosure" accessibilityRole="button"
      accessibilityLabel={`Archived clients (${section.count})`} accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)}
      style={[styles.sectionHeader, styles.disclosure, { borderTopColor: colors.border }]}>
      <UiText type="editorSection" style={styles.copy}>{section.title} ({section.count})</UiText><UiIcon name={expanded ? 'chevronUp' : 'chevron'} size={20} color={colors.textSecondary} />
    </UiPressable> : <View style={styles.sectionHeader}><UiText type="editorSection" accessibilityRole="header">{section.title} ({section.count})</UiText>
      {!!query && <UiText type="metadata" color="textSecondary">{section.data.length} matching clients</UiText>}
    </View>}
    renderSectionFooter={({ section }) => !section.data.length && (!section.archived || expanded) ? <UiText type="secondary" color="textSecondary" style={styles.empty}>
      {query ? `No matching ${section.archived ? 'archived' : 'active'} clients.` : section.archived ? 'No archived clients.' : 'No active clients. Create a client to get started.'}
    </UiText> : null}
    renderItem={({ item }) => <ClientCard client={item} outstanding={totals.get(item.id) ?? 0n} onOpen={() => onOpen(item.id)} onHistory={() => onHistory(item.id)} onArchive={() => onArchive(item.id)} />} />;
}

function ClientCard({ client, outstanding, onOpen, onHistory, onArchive }: {
  client: WorkCounterparty; outstanding: bigint; onOpen: () => void; onHistory: () => void; onArchive: () => void;
}) {
  const colors = useDesignColors(), { width, fontScale } = useWindowDimensions();
  const amount = formatBrlAmount(outstanding), archived = client.deletedAt !== null;
  const stacked = width < 390 || fontScale >= 1.3 || amount.length > 17;
  return <GroupSurface testID="work-client-card" variant="group" style={[styles.card, { borderColor: colors.border }]}>
    <UiPressable accessibilityRole="button" accessibilityLabel={`Open ${client.name} details`} accessibilityHint={`${archived ? 'Archived client. ' : ''}Outstanding ${amount}`}
      onPress={onOpen} style={styles.clientBody}>
      <View style={[styles.icon, { backgroundColor: archived ? colors.inset : colors.brandSoft }]}><UiIcon name="person" size={24} color={archived ? colors.textSecondary : colors.brand} /></View>
      <View style={[styles.clientMetrics, stacked && styles.stacked]}>
        <View style={[styles.copy, stacked && styles.fullCopy]}><UiText type="cardTitle">{client.name}</UiText>{archived && <UiText type="metadata" color="textSecondary">Archived client</UiText>}</View>
        <View style={styles.balance}>
          {amount.length > 17 ? <View testID="client-long-money" accessibilityLabel={amount} style={styles.moneyGroups}>
            {(amount.match(/^R\$\s|\d+\.|\d+,\d{2}$/g) ?? [amount]).map((part, index) => <UiText testID="client-money-group" key={index} type="cardTitle" style={styles.moneyGroup}>{part}</UiText>)}
          </View> : <UiText type="cardTitle" style={styles.money}>{amount}</UiText>}
          <UiText type="metadata" color="textSecondary">Outstanding</UiText>
        </View>
      </View>
    </UiPressable>
    <ContextMenu appearance="v2" label={`Client options for ${client.name}`} actions={[
      { label: 'History', onPress: onHistory }, ...(archived ? [] : [{ label: 'Archive', accessibilityLabel: `Archive ${client.name}`, onPress: onArchive }]),
    ]} />
  </GroupSurface>;
}

const styles = StyleSheet.create({
  list: { flex: 1 }, content: { padding: Space.md, paddingBottom: Space.lg }, header: { gap: Space.md },
  search: { position: 'relative' }, searchInput: { paddingLeft: 44 }, searchIcon: { position: 'absolute', left: Space.md, top: 15 },
  newClient: { padding: Space.md, borderWidth: 1, gap: Space.md }, introduction: { flexDirection: 'row', gap: Space.md, alignItems: 'center' },
  copy: { flex: 1, minWidth: 0, gap: Space.xs }, icon: { width: 40, height: 44, borderRadius: Shape.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  grow: { flex: 1, minWidth: 0 }, fullCopy: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  actions: { flexDirection: 'row', gap: Space.sm, justifyContent: 'flex-end' }, full: { alignSelf: 'stretch' },
  sectionHeader: { paddingTop: Space.lg, paddingBottom: Space.sm, gap: Space.xs }, disclosure: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, marginTop: Space.md, minHeight: TouchTarget },
  card: { padding: Space.sm, borderWidth: 1, marginBottom: Space.sm, flexDirection: 'row', gap: Space.sm, alignItems: 'center' },
  clientBody: { flex: 1, minWidth: 0, minHeight: TouchTarget, flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm },
  clientMetrics: { flex: 1, minWidth: 0, flexDirection: 'row', gap: Space.sm, alignItems: 'flex-start' }, balance: { minWidth: 0, maxWidth: '100%', gap: Space.xs },
  stacked: { flexDirection: 'column', alignItems: 'stretch' }, money: { fontVariant: ['tabular-nums'] },
  moneyGroups: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' }, moneyGroup: { flexShrink: 0, fontVariant: ['tabular-nums'] }, empty: { paddingVertical: Space.sm },
});
