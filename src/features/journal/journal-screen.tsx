import { Stack, useNavigation } from 'expo-router';
import { useHeaderHeight, usePreventRemove } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdaptiveModal } from '@/components/adaptive-sheet';
import { FormButton, FormScrollView, FormSelectionHost, type FormSelectionHandle } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { dateLabel, localDateString } from '@/utils/calendar';

import { JournalContext } from './components/journal-context';
import { JournalDate } from './components/journal-date';
import { JournalEditor } from './components/journal-editor';
import { JournalHistory } from './components/journal-history';
import { JournalLeave } from './components/journal-leave';
import { requestJournalNavigation, type JournalLeaveChoice } from './editor';
import { useJournal } from './use-journal';

export function JournalScreen() {
  const journal = useJournal();
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const selection = useRef<FormSelectionHandle>(null);
  const pendingChoice = useRef<((choice: JournalLeaveChoice) => void) | null>(null);
  const [surface, setSurface] = useState<'date' | 'history' | 'leave' | null>(null);
  const [writingHeight, setWritingHeight] = useState(320);
  function guarded(proceed: () => void) {
    if (pendingChoice.current) return;
    requestJournalNavigation(journal.editor, (choose) => {
      pendingChoice.current = choose;
      setSurface('leave');
    }, proceed);
  }
  function finishChoice(choice: JournalLeaveChoice) {
    const choose = pendingChoice.current;
    pendingChoice.current = null; setSurface(null);
    choose?.(choice);
  }
  function closeSurface() { if (pendingChoice.current) finishChoice('keep'); else setSurface(null); }
  usePreventRemove(journal.editor.dirty(), ({ data }) => {
    if (surface) { closeSurface(); return; }
    if (selection.current?.dismiss()) return;
    guarded(() => navigation.dispatch(data.action));
  });
  function selectDate(date: string) {
    if (date === journal.state.date) { closeSurface(); return; }
    guarded(() => { setSurface(null); Keyboard.dismiss(); journal.loadDate(date); });
  }
  function remove() {
    Alert.alert('Delete journal entry?', `Delete the entry for ${dateLabel(journal.state.date)}? Unsaved changes will also be discarded.`, [
      { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => journal.editor.remove() },
    ]);
  }
  function openSurface(next: 'date' | 'history') {
    selection.current?.dismiss(false); Keyboard.dismiss();
    if (next === 'history') journal.readHistory();
    setSurface(next);
  }
  return <ThemedView style={styles.fill}>
    <Stack.Screen options={{ title: 'Journal', headerBackTitle: 'Home' }} />
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.fill}>
      <FormSelectionHost ref={selection}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={headerHeight}>
          <FormScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            onLayout={(event) => setWritingHeight(Math.max(100, Math.min(320, event.nativeEvent.layout.height - 64)))}>
            <JournalEditor state={journal.state} today={journal.today} writingHeight={writingHeight} onChange={journal.editor.change} onDate={() => openSurface('date')}
              onToday={() => selectDate(localDateString(new Date()))} onHistory={() => openSurface('history')} onDelete={remove} onRetryDraft={journal.editor.flushDraft} />
            {!journal.state.loaded && <FormButton label="Retry journal" onPress={journal.reload} />}
            <JournalContext context={journal.context} error={journal.contextError} onRetry={journal.readContext} />
          </FormScrollView>
          <View style={styles.footer}>
            {!!journal.state.message && <ThemedText type="small" accessibilityLiveRegion="polite">{journal.state.message}</ThemedText>}
            <FormButton label="Save" accessibilityLabel={`Save journal for ${dateLabel(journal.state.date)}`} disabled={!journal.state.loaded}
              onPress={() => { Keyboard.dismiss(); journal.editor.save(); }} />
          </View>
        </KeyboardAvoidingView>
      </FormSelectionHost>
    </SafeAreaView>
    {surface && <AdaptiveModal onDismiss={closeSurface}>
      {surface === 'leave' ? <JournalLeave onChoose={finishChoice} />
        : surface === 'date' ? <JournalDate date={journal.state.date} today={journal.today} onSelect={selectDate} onDismiss={closeSurface} />
        : <JournalHistory entries={journal.history} hasMore={journal.historyBefore !== null} error={journal.historyError}
          onSelect={selectDate} onOlder={() => journal.readHistory(true)} onRetry={() => journal.readHistory()} onDismiss={closeSurface} />}
    </AdaptiveModal>}
  </ThemedView>;
}
const styles = StyleSheet.create({ fill: { flex: 1 }, content: { padding: Spacing.three, gap: Spacing.four },
  footer: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: Spacing.one } });
