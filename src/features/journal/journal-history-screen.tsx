import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormScrollView, FormSelectionHost } from '@/components/form-controls';
import { DesignProvider, useDesignColors } from '@/components/design-system';
import { Space } from '@/constants/theme';

import { JournalHistory } from './components/journal-history';
import { JournalHeader } from './components/journal-surface';
import { useJournalHistory } from './use-journal-history';

export function JournalHistoryScreen() {
  return <DesignProvider><JournalHistoryContent /></DesignProvider>;
}

function JournalHistoryContent() {
  const colors = useDesignColors(); const history = useJournalHistory();
  function back() { if (router.canGoBack()) router.back(); else router.replace('/journal'); }
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
    <FormSelectionHost>
      <JournalHeader title="Journal history" backLabel="Back from journal history" onBack={back} />
      <FormScrollView style={{ flex: 1 }} contentContainerStyle={[styles.inner, styles.content]}>
        <JournalHistory entries={history.page?.entries ?? []} loaded={history.page !== null} hasMore={!!history.page?.nextBefore} error={history.error}
          onRetry={history.retry} onOlder={history.loadOlder}
          onSelect={(date) => router.navigate({ pathname: '/journal', params: { date, entryRequest: randomUUID() } })} />
      </FormScrollView>
    </FormSelectionHost>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ inner: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  content: { padding: Space.lg, paddingBottom: Space.xl, flexGrow: 1 } });
