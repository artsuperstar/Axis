import { router } from 'expo-router';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormButton, FormError } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { DayAgenda } from './components/day-agenda';
import { MonthGrid } from './components/month-grid';
import { activityMarkers, sourceParams } from './projection';
import { useCalendar } from './use-calendar';

export function CalendarScreen() {
  const colors = useTheme(); const insets = useSafeAreaInsets();
  const calendar = useCalendar();
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentInsetAdjustmentBehavior="automatic"
    contentContainerStyle={[styles.content, { paddingTop: (Platform.OS === 'ios' ? 0 : insets.top) + Spacing.three,
      paddingLeft: Math.max(insets.left, Spacing.three), paddingRight: Math.max(insets.right, Spacing.three) }]}>
    <View style={styles.inner}>
      <ThemedText type="subtitle" accessibilityRole="header">Calendar</ThemedText>
      <MonthGrid selection={calendar.selection} today={calendar.today} markers={activityMarkers(calendar.items ?? [])}
        onDate={calendar.onDate} onMove={calendar.onMove} onToday={calendar.onToday} />
      <FormError message={calendar.error || calendar.actionError} />
      {!!calendar.error && <FormButton label="Retry" onPress={calendar.reload} />}
      {calendar.items ? <DayAgenda date={calendar.selection.selected} items={calendar.items} onToggleTask={calendar.toggleTask}
        onOpen={(item) => router.push({ pathname: '/calendar-source', params: sourceParams(item) })} />
        : !calendar.error && <ActivityIndicator color={colors.text} accessibilityLabel="Loading Calendar" />}
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: Spacing.four }, inner: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: Spacing.three },
});
