import { router } from 'expo-router';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormButton, FormError } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateLabel } from '@/utils/calendar';

import { HomeContent } from './components/home-content';
import { useHome } from './use-home';

export function HomeScreen() {
  const colors = useTheme(); const insets = useSafeAreaInsets();
  const home = useHome();
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentInsetAdjustmentBehavior="automatic"
    contentContainerStyle={[styles.content, { paddingTop: (Platform.OS === 'ios' ? 0 : insets.top) + Spacing.three,
      paddingLeft: Math.max(insets.left, Spacing.three), paddingRight: Math.max(insets.right, Spacing.three) }]}>
    <View style={styles.inner}>
      <ThemedText type="subtitle" accessibilityRole="header">Home</ThemedText>
      {home.snapshot && <ThemedText type="small" themeColor="textSecondary">{dateLabel(home.snapshot.date)}</ThemedText>}
      <FormError message={home.error || home.actionError} />
      {!!home.error && <FormButton label="Retry" onPress={home.reload} />}
      {home.snapshot ? <HomeContent snapshot={home.snapshot} onOpen={(target) => target.pathname === '/(tabs)/fitness' ? router.navigate(target) : router.push(target)} onComplete={home.completeTask} />
        : !home.error && <ActivityIndicator color={colors.text} accessibilityLabel="Loading Home" />}
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: Spacing.four }, inner: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: Spacing.three },
});
