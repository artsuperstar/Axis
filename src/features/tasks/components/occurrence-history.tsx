import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { dateLabel, userError } from '../form';
import { occurrenceLabels, occurrenceState } from '../recurrence';
import type { OccurrenceStatus, Task, TaskOccurrence } from '../types';
import { TaskButton, TaskError } from './controls';

type Page = { occurrences: TaskOccurrence[]; nextBefore: string | null };

export function OccurrenceHistory({ task, readPage, onStatus, onDismiss, now }: {
  task: Task;
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
    <Modal visible presentationStyle="pageSheet" onRequestClose={onDismiss}>
      <SafeAreaProvider>
        <ThemedView style={styles.container} accessibilityViewIsModal onAccessibilityEscape={onDismiss}>
          <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.header}>
                <ThemedText type="smallBold" accessibilityRole="header" style={styles.title}>{task.title} · History</ThemedText>
                <TaskButton label="Done" onPress={onDismiss} />
              </View>
              <ScrollView contentContainerStyle={styles.content}>
                <TaskError message={error} />
                {!!error && <TaskButton label="Retry" onPress={older} />}
                {!entries.length && !error && <ThemedText>No past occurrences yet.</ThemedText>}
                {entries.map((entry) => (
                  <View key={entry.id} style={styles.entry}>
                    <ThemedText>{dateLabel(entry.scheduledDate)}{entry.scheduledTime ? ` at ${entry.scheduledTime}` : ''}</ThemedText>
                    <ThemedText type="small">{occurrenceLabels[occurrenceState(entry, new Date(now))]}{entry.deletedAt !== null ? ' · Previous schedule' : ''}</ThemedText>
                    {entry.deletedAt === null && (
                      <View style={styles.buttons}>
                        <TaskButton label={entry.status === 'completed' ? 'Reopen' : 'Complete'} accessibilityLabel={`${entry.status === 'completed' ? 'Reopen' : 'Complete'} occurrence on ${dateLabel(entry.scheduledDate)}`} onPress={() => change(entry, entry.status === 'completed' ? 'pending' : 'completed')} />
                        {entry.status !== 'completed' && <TaskButton label={entry.status === 'skipped' ? 'Return to pending' : 'Skip'} accessibilityLabel={`${entry.status === 'skipped' ? 'Return to pending' : 'Skip'} occurrence on ${dateLabel(entry.scheduledDate)}`} onPress={() => change(entry, entry.status === 'skipped' ? 'pending' : 'skipped')} />}
                      </View>
                    )}
                  </View>
                ))}
                {nextBefore && <TaskButton label="Load older history" onPress={older} />}
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </ThemedView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  entry: { gap: Spacing.two, paddingBottom: Spacing.three },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
