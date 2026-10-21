import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { FormButton, FormError } from '@/components/form-controls';
import { UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import { DesignSpace as Space, TouchTarget } from '@/constants/design-system-v2';
import { dateLabel, localDateString } from '@/utils/calendar';

import { journalPreview, moodLabel } from '../form';
import { journalFullDate, journalHistoryGroups } from '../presentation';
import type { JournalEntry } from '../types';

/** Saved rows only. Opening a row returns to the same date-centric editable Journal. */
export function JournalHistory({ entries, loaded = true, hasMore, error, onSelect, onOlder, onRetry }: {
  entries: JournalEntry[]; loaded?: boolean; hasMore: boolean; error: string | null; onSelect: (date: string) => void;
  onOlder: () => void; onRetry: () => void;
}) {
  const colors = useDesignColors(); const today = localDateString(new Date());
  return <View style={styles.content}>
    <FormError appearance="v2" message={error} />
    {error && <FormButton appearance="v2" variant="quiet" label="Retry history" onPress={onRetry} />}
    {!loaded && !error && <ActivityIndicator color={colors.brand} accessibilityLabel="Loading journal history" />}
    {loaded && entries.length === 0 && <UiText color="textSecondary">No journal entries yet</UiText>}
    {journalHistoryGroups(entries).map((group) => <View key={group.key}>
      <UiText type="editorSection" accessibilityRole="header" style={styles.month}>{group.label}</UiText>
      {group.entries.map((entry) => <UiPressable key={entry.id} accessibilityRole="button"
        accessibilityLabel={`Open journal for ${journalFullDate(entry.entryDate)}${entry.mood ? `, mood ${moodLabel(entry.mood)}` : ''}. Preview: ${journalPreview(entry)}`}
        accessibilityHint="Opens this date in Journal. You can edit the entry."
        onPress={() => onSelect(entry.entryDate)} style={({ pressed }) => [styles.row, { borderColor: colors.border }, pressed && { backgroundColor: colors.control }]}>
        <View style={styles.body}><View style={styles.heading}><UiText type="cardTitle">{entry.entryDate === today ? 'Today' : dateLabel(entry.entryDate)}</UiText>
          {entry.mood && <UiText type="metadata" color="textSecondary">{moodLabel(entry.mood)}</UiText>}</View>
        {!!entry.content.trim() && <UiText type="secondary" numberOfLines={2} color="textSecondary">{journalPreview(entry)}</UiText>}</View>
        <UiIcon name="forward" color={colors.textMuted} size={18} />
      </UiPressable>)}
    </View>)}
    {hasMore && <FormButton appearance="v2" variant="quiet" label="Load older entries" onPress={onOlder} />}
  </View>;
}
const styles = StyleSheet.create({ content: { gap: Space.xl }, month: { marginBottom: Space.sm },
  row: { minHeight: TouchTarget, paddingVertical: Space.lg, gap: Space.sm, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  body: { flex: 1, minWidth: 0, gap: Space.xs },
  heading: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, alignItems: 'baseline' } });
