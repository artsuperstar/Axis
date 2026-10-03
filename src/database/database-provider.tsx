import * as SplashScreen from 'expo-splash-screen';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { initializeDatabase, type AxisDatabase } from './client';

const DatabaseContext = createContext<AxisDatabase | null>(null);

function hideSplash() {
  void SplashScreen.hideAsync().catch((error) => console.error('Splash hide failed', error));
}

export function DatabaseProvider({ children }: PropsWithChildren) {
  const colors = useTheme();
  const [database, setDatabase] = useState<AxisDatabase | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    initializeDatabase().then((db) => {
      if (active) setDatabase(db);
    }).catch((error) => {
      console.error('Axis database initialization failed', error);
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, [attempt]);

  if (database) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]} onLayout={hideSplash}>
        <DatabaseContext.Provider value={database}>{children}</DatabaseContext.Provider>
      </View>
    );
  }

  if (!failed) {
    // On first launch the native splash remains visible; retries have an immediate loading view.
    return (
      <ThemedView style={styles.message}>
        <ActivityIndicator color={colors.text} accessibilityLabel="Preparing local data" />
        <ThemedText>Preparing local data…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView key="database-error" style={styles.message} onLayout={hideSplash}>
      <ThemedText type="subtitle">Unable to open local data</ThemedText>
      <ThemedText>Your data has not been reset. Please try again.</ThemedText>
      <Pressable
        accessibilityRole="button"
        style={[styles.retry, { backgroundColor: colors.backgroundElement }]}
        onPress={() => { setFailed(false); setAttempt((value) => value + 1); }}>
        <ThemedText>Try again</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

export function useDatabase() {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('useDatabase must be called within a ready DatabaseProvider.');
  return db;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  retry: { minHeight: 44, padding: Spacing.three, borderRadius: Spacing.two },
});
