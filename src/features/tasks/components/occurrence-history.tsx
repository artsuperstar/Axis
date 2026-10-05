import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AdaptiveModal, AdaptiveSheet } from '@/components/adaptive-sheet';
import { Spacing } from '@/constants/theme';

import { userError } from '../form';
import { taskRowPresentation } from '../presentation';
import type { OccurrenceStatus, Task, TaskCategory, TaskOccurrence, TaskRecurrence } from '../types';
import { TaskButton, TaskError } from './controls';

type Page = { occurrences: TaskOccurrence[]; nextBefore: string | null };

export function OccurrenceHistory({ task, categories, recurrences, readPage, onStatus, onDismiss, now }: {
  task: Task;
  categories: TaskCategory[];
  recurrences: TaskRecurrence[];
  readPage: (before?: string) => Page;
  onStatus: (id: string, status: OccurrenceStatus) => TaskOccurrence;
  onDismiss: () => void;
  now: number;
}) {
  const [entries, setEntries] = useState<TaskOccurrence[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The first read is synchronous SQLite work. Keep it outside render.
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => readPage()).then((page) => {
      if (!active) return;
      setEntries(page.occurrences);
      setNextBefore(page.nextBefore);
    }).catch((cause) => {
      if (active) setError(userError(cause, 'Unable to load history. Please try again.'));
    });
    return () => { active = false; };
  }, [readPage]);

  function older() {
    try {
      const page = readPage(nextBefore ?? undefined);
      setEntries((current) => Array.from(new Map([...current, ...page.occurrences].map((entry) => [entry.id, entry])).values()));
      setNextBefore(page.nextBefore);
      setError(null);
    } catch (cause) { setError(userError(cause, 'Unable to load history. Please try again.')); }
  }

  function change(entry: TaskOccurrence, status: OccurrenceStatus) {
    try {
      const updated = onStatus(entry.id, status);
      setEntries((current) => current.map((item) => item.id === updated.id ? updated : item));
      setError(null);
    } catch (cause) { setError(userError(cause, 'Unable to update this occurrence. Please try again.')); }
  }

  return (
    <AdaptiveModal onDismiss={onDismiss}>
      <AdaptiveSheet contentContainerStyle={styles.content} header={<View style={styles.header}>
        <ThemedText type="sheetTitle" accessibilityRole="header" style={styles.title}>{task.title} · History</ThemedText>
        <TaskButton variant="quiet" label="Done" onPress={onDismiss} />
              </View>}>
        <TaskError message={error} />
        {!!error && <TaskButton label="Retry" onPress={older} />}
        {!entries.length && !error && <ThemedText>No past occurrences yet.</ThemedText>}
        {entries.map((entry) => {
          const row = taskRowPresentation(task, entry, recurrences, categories, now);
          return (
            <View key={entry.id} style={styles.entry}>
              <View accessible style={styles.metadata} accessibilityLabel={`${row.accessibilityLabel}${entry.deletedAt !== null ? '. Previous schedule' : ''}`}>
                <ThemedText>{row.date}</ThemedText>
                <ThemedText type="small">{row.historyOutcome}{entry.deletedAt !== null ? ' · Previous schedule' : ''}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{row.recurrence}</ThemedText>
              </View>
              {entry.deletedAt === null && (
                <View style={styles.buttons}>
                  <TaskButton label={entry.status === 'completed' ? 'Reopen' : 'Complete'} accessibilityLabel={`${entry.status === 'completed' ? 'Reopen' : 'Complete'} ${row.actionSubject}`} onPress={() => change(entry, entry.status === 'completed' ? 'pending' : 'completed')} />
                  {entry.status !== 'completed' && <TaskButton label={entry.status === 'skipped' ? 'Return to pending' : 'Skip'} accessibilityLabel={`${entry.status === 'skipped' ? 'Return to pending' : 'Skip'} ${row.actionSubject}`} onPress={() => change(entry, entry.status === 'skipped' ? 'pending' : 'skipped')} />}
                </View>
              )}
            </View>
          );
        })}
        {nextBefore && <TaskButton label="Load older history" onPress={older} />}
      </AdaptiveSheet>
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  header: { padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  entry: { gap: Spacing.two, paddingBottom: Spacing.three },
  metadata: { gap: Spacing.two },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
