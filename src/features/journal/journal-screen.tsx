import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdaptiveModal } from '@/components/adaptive-sheet';
import { BackButton } from '@/components/back-button';
import { ContextMenu, ContextMenuHost } from '@/components/context-menu';
import { FormButton, FormError, FormScrollView, type FormSelectionHandle } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, localDateString } from '@/utils/calendar';

import { JournalContext } from './components/journal-context';
import { JournalDate, JournalDayNavigation } from './components/journal-date';
import { JournalEditor } from './components/journal-editor';
import { JournalLeave } from './components/journal-leave';
import { requestJournalNavigation, type JournalLeaveChoice } from './editor';
import { journalFullDate, journalSaveLabel, journalWritingVisible } from './presentation';
import { useJournal } from './use-journal';

export function JournalScreen() {
  const params = useLocalSearchParams<{ date?: string; entryRequest?: string }>();
  const requestedDate = typeof params.date === 'string' ? params.date : undefined;
  const journal = useJournal(requestedDate);
  const { editor, targetDate, loadDate } = journal;
  const navigation = useNavigation();
  const colors = useTheme(); const insets = useSafeAreaInsets(); const { fontScale } = useWindowDimensions();
  const selection = useRef<FormSelectionHandle>(null);
  const pendingChoice = useRef<((choice: JournalLeaveChoice) => void) | null>(null);
  const [surface, setSurface] = useState<'date' | 'leave' | null>(null);
  const [writingDate, setWritingDate] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [writingHeight, setWritingHeight] = useState(320);
  const guarded = useCallback((proceed: () => void) => {
    if (pendingChoice.current) return;
    requestJournalNavigation(editor, (choose) => {
      pendingChoice.current = choose; setSurface('leave');
    }, proceed);
  }, [editor]);
  function finishChoice(choice: JournalLeaveChoice) {
    const choose = pendingChoice.current;
    pendingChoice.current = null; setSurface(null); choose?.(choice);
  }
  function closeSurface() { if (pendingChoice.current) finishChoice('keep'); else setSurface(null); }
  usePreventRemove(journal.editor.dirty(), ({ data }) => {
    if (surface) { closeSurface(); return; }
    if (selection.current?.dismiss()) return;
    guarded(() => navigation.dispatch(data.action));
  });
  const selectDate = useCallback((date: string) => {
    if (date === targetDate && date === editor.getState().date) { setSurface(null); return; }
    guarded(() => { setSurface(null); Keyboard.dismiss(); loadDate(date); });
  }, [guarded, editor, loadDate, targetDate]);
  // A unique History request can select a date already present in retained route params.
  // Ordinary internal day browsing and midnight refreshes never replay that request.
  const intent = `${requestedDate ?? 'today'}:${params.entryRequest ?? ''}`;
  const handledIntent = useRef(intent);
  useEffect(() => {
    if (handledIntent.current === intent) return;
    handledIntent.current = intent; selectDate(requestedDate ?? localDateString(new Date()));
  }, [intent, requestedDate, selectDate]);
  function back() { guarded(() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); }); }
  function history() { guarded(() => { Keyboard.dismiss(); router.push('/journal/history'); }); }
  function remove() {
    Alert.alert('Delete journal entry?', `Delete the entry for ${journalFullDate(journal.state.date)}? Unsaved changes will also be discarded.`, [
      { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => journal.editor.remove() },
    ]);
  }
  function discardConflict() {
    Alert.alert('Discard local changes?', 'Your unsaved writing will be discarded and the current saved entry will be loaded.', [
      { text: 'Keep editing', style: 'cancel' }, { text: 'Discard changes', style: 'destructive', onPress: () => journal.editor.discard() },
    ]);
  }
  const targetFailed = journal.targetDate !== journal.state.date || !journal.state.loaded;
  const writingVisible = journalWritingVisible(journal.state, journal.today, writingDate);
  const saveLabel = journalSaveLabel(journal.state);
  return <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
    <ContextMenuHost ref={selection}>
      <View style={[styles.inner, styles.header]} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
        <BackButton accessibilityLabel="Back from journal" onPress={back} />
        <ThemedText type="screenTitle" accessibilityRole="header" style={styles.title}>Journal</ThemedText>
        <ContextMenu label="Journal options" actions={[
          { label: 'History', onPress: history },
          ...(!targetFailed && journal.state.entry && !journal.state.conflict ? [{ label: 'Delete entry', variant: 'destructive' as const, onPress: remove }] : []),
        ]} />
      </View>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + headerHeight}>
        <FormScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onLayout={(event) => setWritingHeight(Math.max(240, Math.min(400, event.nativeEvent.layout.height * 0.6)))}>
          <View style={styles.inner}>
            <JournalDayNavigation date={journal.targetDate} today={journal.today} onDate={() => { Keyboard.dismiss(); setSurface('date'); }}
              onPrevious={() => selectDate(addDays(journal.targetDate, -1))} onNext={() => selectDate(addDays(journal.targetDate, 1))}
              onToday={() => selectDate(localDateString(new Date()))} />
            {targetFailed ? <>
              <FormError message={journal.state.error} />
              {journal.state.error ? <>
                <ThemedText type="secondary" themeColor="textSecondary">Unable to open {journalFullDate(journal.targetDate)}.{journal.state.loaded ? ' Your previous day is kept.' : ''}</ThemedText>
                <FormButton variant="quiet" label="Retry journal" onPress={journal.reload} />
                {journal.state.loaded && <FormButton variant="quiet" label="Return to loaded day" onPress={() => selectDate(journal.state.date)} />}
              </> : <ActivityIndicator color={colors.accent} accessibilityLabel="Loading journal day" />}
            </> : <>
              <JournalEditor state={journal.state} writingVisible={writingVisible} writingHeight={Math.max(writingHeight, 180 * fontScale)}
                onWrite={() => setWritingDate(journal.state.date)} onChange={journal.editor.change}
                onRetryDraft={journal.editor.flushDraft} onDiscardConflict={discardConflict} />
              {!!journal.state.error && <FormButton variant="quiet" label="Retry journal" onPress={journal.reload} />}
              <JournalContext context={journal.context} error={journal.contextError} onRetry={journal.readContext} />
            </>}
          </View>
        </FormScrollView>
        {!targetFailed && writingVisible && <View style={[styles.footer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.inner, styles.save]}>
            {!!journal.state.message && <ThemedText type="metadata" themeColor="textSecondary" accessibilityLiveRegion="polite" style={styles.message}>{journal.state.message}</ThemedText>}
            <FormButton variant="primary" label={saveLabel} accessibilityLabel={`${saveLabel} journal for ${journalFullDate(journal.state.date)}`} disabled={journal.state.conflict}
              onPress={() => { Keyboard.dismiss(); journal.editor.save(); }} />
          </View>
        </View>}
      </KeyboardAvoidingView>
    </ContextMenuHost>
    {surface && <AdaptiveModal onDismiss={closeSurface}>
      {surface === 'leave' ? <JournalLeave onChoose={finishChoice} />
        : <JournalDate date={journal.targetDate} today={journal.today} onSelect={selectDate} onDismiss={closeSurface} />}
    </AdaptiveModal>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({ fill: { flex: 1 }, inner: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: Space.xl },
  header: { padding: Space.lg, flexDirection: 'row', alignItems: 'center', gap: Space.sm }, title: { flex: 1, minWidth: 0 },
  content: { padding: Space.lg, paddingBottom: Space.xl, flexGrow: 1 },
  footer: { paddingHorizontal: Space.lg, paddingVertical: Space.md, borderTopWidth: 1 },
  save: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: Space.sm }, message: { flex: 1, minWidth: 80 } });
