import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { FormScrollView, FormSelectionHost } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { JournalHistory } from './components/journal-history';
import { useJournalHistory } from './use-journal-history';

export function JournalHistoryScreen() {
  const colors = useTheme(); const history = useJournalHistory();
  function back() { if (router.canGoBack()) router.back(); else router.replace('/journal'); }
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <FormSelectionHost>
      <View style={[styles.inner, styles.header]}>
        <BackButton accessibilityLabel="Back from journal history" onPress={back} />
        <ThemedText type="screenTitle" accessibilityRole="header" style={{ flex: 1 }}>Journal history</ThemedText>
      </View>
      <FormScrollView style={{ flex: 1 }} contentContainerStyle={[styles.inner, styles.content]}>
        <JournalHistory entries={history.page?.entries ?? []} loaded={history.page !== null} hasMore={!!history.page?.nextBefore} error={history.error}
          onRetry={history.retry} onOlder={history.loadOlder}
          onSelect={(date) => router.navigate({ pathname: '/journal', params: { date, entryRequest: randomUUID() } })} />
      </FormScrollView>
    </FormSelectionHost>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ inner: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { padding: Space.lg, flexDirection: 'row', alignItems: 'center', gap: Space.sm }, content: { padding: Space.lg, paddingBottom: Space.xl, flexGrow: 1 } });
