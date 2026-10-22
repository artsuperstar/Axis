import { router } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

import { FormButton, FormError } from '@/components/form-controls';
import { DesignProvider, UiText, useDesignColors } from '@/components/design-system';

import { DayAgenda } from './components/day-agenda';
import { MonthGrid } from './components/month-grid';
import { activityMarkers, sourceParams } from './projection';
import { useCalendar } from './use-calendar';

export function CalendarScreen() {
  return <DesignProvider><CalendarContent /></DesignProvider>;
}

function CalendarContent() {
  const colors = useDesignColors();
  const calendar = useCalendar();
  return <SafeAreaView edges={{ top: true, bottom: true, left: true, right: true }} style={{ flex: 1, backgroundColor: colors.canvas }}>
    <DayAgenda date={calendar.selection.selected} today={calendar.today} items={calendar.items ?? []} loaded={calendar.items !== null}
      onToggleTask={calendar.toggleTask} onOpen={(item) => router.push({ pathname: '/calendar-source', params: sourceParams(item) })}
      header={<>
      <UiText type="screenTitle" accessibilityRole="header">Calendar</UiText>
      <MonthGrid selection={calendar.selection} today={calendar.today} markers={activityMarkers(calendar.items ?? [])}
        onDate={calendar.onDate} onMove={calendar.onMove} onToday={calendar.onToday} />
      <FormError appearance="v2" message={calendar.error || calendar.actionError} />
      {!!calendar.error && <FormButton appearance="v2" label="Retry" onPress={calendar.reload} />}
      {!calendar.items && !calendar.error && <ActivityIndicator color={colors.brand} accessibilityLabel="Loading Calendar" />}
      </>} />
  </SafeAreaView>;
}
