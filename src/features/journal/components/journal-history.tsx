import { Pressable, StyleSheet, View } from 'react-native';

import { AdaptiveSheet } from '@/components/adaptive-sheet';
import { FormButton, FormError } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateLabel } from '@/utils/calendar';

import { journalPreview, moodLabel } from '../form';
import type { JournalEntry } from '../types';

export function JournalHistory({ entries, hasMore, error, onSelect, onOlder, onRetry, onDismiss }: {
  entries: JournalEntry[]; hasMore: boolean; error: string | null; onSelect: (date: string) => void;
  onOlder: () => void; onRetry: () => void; onDismiss: () => void;
}) {
  const colors = useTheme();
  return <AdaptiveSheet title="Journal history" onDismiss={onDismiss}>
    <FormError message={error} />
    {error && <FormButton label="Retry history" onPress={onRetry} />}
    {!error && entries.length === 0 && <ThemedText themeColor="textSecondary">No saved journal entries yet.</ThemedText>}
    {entries.map((entry) => <Pressable key={entry.id} accessibilityRole="button"
      accessibilityLabel={`Open journal for ${dateLabel(entry.entryDate)}${entry.mood ? `, mood ${moodLabel(entry.mood)}` : ''}. ${journalPreview(entry)}`}
      onPress={() => onSelect(entry.entryDate)} style={[styles.row, { borderColor: colors.backgroundSelected }]}>
      <View style={styles.heading}><ThemedText type="smallBold">{dateLabel(entry.entryDate)}</ThemedText>
        {entry.mood && <ThemedText type="small" themeColor="textSecondary">{moodLabel(entry.mood)}</ThemedText>}</View>
      <ThemedText type="small" numberOfLines={2} themeColor="textSecondary">{journalPreview(entry)}</ThemedText>
    </Pressable>)}
    {hasMore && <FormButton label="Load older entries" onPress={onOlder} />}
  </AdaptiveSheet>;
}
const styles = StyleSheet.create({ row: { minHeight: 64, paddingVertical: Spacing.two, gap: Spacing.two, borderBottomWidth: 1 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two } });
