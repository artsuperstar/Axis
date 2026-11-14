import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { UiText, useDesignColors } from '@/components/design-system';
import { AdaptiveModal, AdaptiveSheet } from '@/components/adaptive-sheet';
import { StatusText } from '@/components/status-text';
import { Space } from '@/constants/theme';

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
  const colors = useDesignColors();
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
      <AdaptiveSheet appearance="v2" titleRole="operational" title={`${task.title} · History`} onDismiss={onDismiss} contentContainerStyle={styles.content}>
        <TaskError appearance="v2" message={error} />
        {!!error && <TaskButton appearance="v2" label="Retry" onPress={older} />}
        {!entries.length && !error && <UiText type="body">No past occurrences yet.</UiText>}
        {entries.map((entry) => {
          const row = taskRowPresentation(task, entry, recurrences, categories, now);
          return (
            <View key={entry.id} style={[styles.entry, { borderColor: colors.border }]}>
              <View accessible style={styles.metadata} accessibilityLabel={`${row.accessibilityLabel}${entry.deletedAt !== null ? '. Previous schedule' : ''}`}>
                <UiText type="cardTitle" color={row.resolved ? 'textSecondary' : 'textPrimary'}>{row.date}</UiText>
                <StatusText appearance="v2" type="metadata" tone={row.attention ? 'attention' : row.resolved || entry.deletedAt !== null ? 'subdued' : 'neutral'}>{row.historyOutcome}{entry.deletedAt !== null ? ' · Previous schedule' : ''}</StatusText>
                <UiText type="metadata" color="textSecondary">{row.recurrence}</UiText>
              </View>
              {entry.deletedAt === null && (
                <View style={styles.buttons}>
                  <TaskButton appearance="v2" variant="quiet" label={entry.status === 'completed' ? 'Reopen' : 'Complete'} accessibilityLabel={`${entry.status === 'completed' ? 'Reopen' : 'Complete'} ${row.actionSubject}`} onPress={() => change(entry, entry.status === 'completed' ? 'pending' : 'completed')} />
                  {entry.status !== 'completed' && <TaskButton appearance="v2" variant="quiet" label={entry.status === 'skipped' ? 'Return to pending' : 'Skip'} accessibilityLabel={`${entry.status === 'skipped' ? 'Return to pending' : 'Skip'} ${row.actionSubject}`} onPress={() => change(entry, entry.status === 'skipped' ? 'pending' : 'skipped')} />}
                </View>
              )}
            </View>
          );
        })}
        {nextBefore && <TaskButton appearance="v2" label="Load older history" onPress={older} />}
      </AdaptiveSheet>
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  content: { padding: Space.lg, gap: Space.lg },
  entry: { gap: Space.sm, paddingBottom: Space.lg, borderBottomWidth: 1 },
  metadata: { gap: Space.xs },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
});
