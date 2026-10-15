import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { FormButton, FormError } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { ControlSize, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateLabel, localDateString } from '@/utils/calendar';

import { journalPreview, moodLabel } from '../form';
import { journalFullDate, journalHistoryGroups } from '../presentation';
import type { JournalEntry } from '../types';

/** Saved rows only. Opening a row returns to the same date-centric editable Journal. */
export function JournalHistory({ entries, loaded = true, hasMore, error, onSelect, onOlder, onRetry }: {
  entries: JournalEntry[]; loaded?: boolean; hasMore: boolean; error: string | null; onSelect: (date: string) => void;
  onOlder: () => void; onRetry: () => void;
}) {
  const colors = useTheme(); const today = localDateString(new Date());
  return <View style={styles.content}>
    <FormError message={error} />
    {error && <FormButton variant="quiet" label="Retry history" onPress={onRetry} />}
    {!loaded && !error && <ActivityIndicator color={colors.accent} accessibilityLabel="Loading journal history" />}
    {loaded && entries.length === 0 && <ThemedText themeColor="textSecondary">No journal entries yet</ThemedText>}
    {journalHistoryGroups(entries).map((group) => <View key={group.key}>
      <ThemedText type="sectionHeading" accessibilityRole="header" style={styles.month}>{group.label}</ThemedText>
      {group.entries.map((entry) => <Pressable key={entry.id} accessibilityRole="button"
        accessibilityLabel={`Open journal for ${journalFullDate(entry.entryDate)}${entry.mood ? `, mood ${moodLabel(entry.mood)}` : ''}. Preview: ${journalPreview(entry)}`}
        accessibilityHint="Opens this date in Journal. You can edit the entry."
        onPress={() => onSelect(entry.entryDate)} style={({ pressed }) => [styles.row, { borderColor: colors.border }, pressed && { backgroundColor: colors.surfaceMuted }]}>
        <View style={styles.heading}><ThemedText type="cardTitle">{entry.entryDate === today ? 'Today' : dateLabel(entry.entryDate)}</ThemedText>
          {entry.mood && <ThemedText type="metadata" themeColor="textSecondary">{moodLabel(entry.mood)}</ThemedText>}</View>
        {!!entry.content.trim() && <ThemedText type="secondary" numberOfLines={2} themeColor="textSecondary">{journalPreview(entry)}</ThemedText>}
      </Pressable>)}
    </View>)}
    {hasMore && <FormButton variant="quiet" label="Load older entries" onPress={onOlder} />}
  </View>;
}
const styles = StyleSheet.create({ content: { gap: Space.xl }, month: { marginBottom: Space.sm },
  row: { minHeight: ControlSize.touch, paddingVertical: Space.md, gap: Space.sm, borderBottomWidth: 1 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, alignItems: 'baseline' } });
