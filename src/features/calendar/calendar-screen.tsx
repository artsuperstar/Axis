import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { FormButton, FormError } from '@/components/form-controls';
import { ThemedText } from '@/components/themed-text';
import { Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { DayAgenda } from './components/day-agenda';
import { MonthGrid } from './components/month-grid';
import { activityMarkers, sourceParams } from './projection';
import { useCalendar } from './use-calendar';

export function CalendarScreen() {
  const colors = useTheme();
  const calendar = useCalendar();
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.content}>
    <View style={styles.inner}>
      <ThemedText type="screenTitle" accessibilityRole="header">Calendar</ThemedText>
      <MonthGrid selection={calendar.selection} today={calendar.today} markers={activityMarkers(calendar.items ?? [])}
        onDate={calendar.onDate} onMove={calendar.onMove} onToday={calendar.onToday} />
      <FormError message={calendar.error || calendar.actionError} />
      {!!calendar.error && <FormButton label="Retry" onPress={calendar.reload} />}
      {calendar.items ? <DayAgenda date={calendar.selection.selected} today={calendar.today} items={calendar.items} onToggleTask={calendar.toggleTask}
        onOpen={(item) => router.push({ pathname: '/calendar-source', params: sourceParams(item) })} />
        : !calendar.error && <ActivityIndicator color={colors.text} accessibilityLabel="Loading Calendar" />}
    </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: Space.lg, paddingBottom: Space.xxl }, inner: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: Space.lg },
});
