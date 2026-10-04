import { Stack, useLocalSearchParams } from 'expo-router';

import { FormError } from '@/components/form-controls';
import { TasksScreen } from '@/features/tasks/tasks-screen';
import { FinanceScreen } from '@/features/finance/finance-screen';
import { validDate } from '@/utils/calendar';

/** Launch the existing source screen and its existing adaptive editor/details, without duplicating actions. */
export function CalendarSourceScreen() {
  const { source, recordId, date } = useLocalSearchParams<{ source: string; recordId: string; date: string }>();
  if (typeof recordId !== 'string' || !recordId || typeof date !== 'string' || !validDate(date)
    || !['task', 'commitment', 'work'].includes(source)) return <FormError message="This Calendar item is no longer available." />;
  return <>
    <Stack.Screen options={{ title: source === 'task' ? 'Task' : source === 'commitment' ? 'Commitment' : 'Work', headerBackTitle: 'Calendar' }} />
    {source === 'task' ? <TasksScreen initialTaskId={recordId} />
      : <FinanceScreen initialView={source === 'commitment' ? 'commitments' : 'work'} initialRecordId={recordId} initialDueDate={date} />}
  </>;
}
