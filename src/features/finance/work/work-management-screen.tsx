import { router } from 'expo-router';
import { useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { ContextMenuHost } from '@/components/context-menu';
import { BackButton } from '@/components/back-button';
import { FormButton } from '@/components/form-controls';
import type { FormSelectionHandle } from '@/components/form-selection-host';
import { SheetRefreshContext } from '@/components/sheet-refresh-notice';
import { StatusText } from '@/components/status-text';
import { DesignProvider, UiText, useDesignColors } from '@/components/design-system';
import { Space } from '@/constants/theme';

import { useFinance } from '../use-finance';
import { WorkView } from './components/work-view';

export function WorkClientsScreen() { return <WorkManagementScreen destination="clients" />; }
export function WorkHistoryScreen() { return <WorkManagementScreen destination="history" />; }

/** Card routes retain the underlying Finance workspace; editors/details keep their shared sheets. */
function WorkManagementScreen({ destination }: { destination: 'clients' | 'history' }) {
  const design = useDesignColors();
  const clients = destination === 'clients';
  const menuHost = useRef<FormSelectionHandle>(null);
  const { snapshot, workAccess, access, mutate, error, reload } = useFinance('work', undefined, undefined, true);
  const content = snapshot?.work ? <WorkView destination={destination} data={snapshot.work} categories={snapshot.categories} access={workAccess} mutate={mutate}
    onScroll={() => menuHost.current?.dismiss(false)} onCreateCategory={(name) => mutate(() => access.createCategory(name, 'income'))} />
    : !error && <ActivityIndicator color={design.brand} accessibilityLabel={`Loading Work ${destination}`} />;
  return <DesignProvider><SheetRefreshContext.Provider value={{ error, onRetry: reload }}>
    <SafeAreaView edges={{ top: true, bottom: true, left: true, right: true }} style={{ flex: 1, backgroundColor: design.canvas }}>
      <ContextMenuHost ref={menuHost} safeAreaApplied>
        <View testID="work-management-header" style={[styles.inner, styles.header]}>
          <View style={styles.titleRow}>
            <BackButton appearance="v2" iconOnly accessibilityLabel="Back to Work" onPress={() => {
              if (router.canGoBack()) router.back(); else router.replace('/work');
            }} />
            <UiText type="editorTitle" accessibilityRole="header" style={{ flexShrink: 1 }}>{clients ? 'Clients' : 'History'}</UiText>
          </View>
          {!!error && <View style={styles.notice}><StatusText tone="attention" accessibilityRole="alert">{error}</StatusText><FormButton variant="quiet" label="Retry" onPress={reload} /></View>}
        </View>
        <View style={[styles.inner, { flex: 1 }]}>{content}</View>
      </ContextMenuHost>
    </SafeAreaView>
  </SheetRefreshContext.Provider></DesignProvider>;
}
const styles = StyleSheet.create({
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { padding: Space.lg, gap: Space.sm }, titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm },
  notice: { gap: Space.sm }, content: { padding: Space.lg, paddingBottom: Space.xl, flexGrow: 1 },
});
