import { Stack } from 'expo-router';

import { FormError } from '@/components/form-controls';
import { FinanceScreen } from '@/features/finance/finance-screen';
import { FitnessScreen } from '@/features/fitness/fitness-screen';
import { TasksScreen } from '@/features/tasks/tasks-screen';

import type { SourceRequest } from './source-navigation';

/** Navigation adapters launch source-owned screens, editors and adaptive sheets. */
export function SourceScreen({ request, origin }: { request: SourceRequest | null; origin: 'Home' | 'Calendar' }) {
  if (!request) return <FormError message={`This ${origin} item is no longer available.`} />;
  const title = request.source === 'task' ? 'Task' : request.source === 'commitment' ? request.recordId ? 'Commitment' : 'Commitments' : request.source === 'work' ? 'Work' : 'Workout';
  return <>
    <Stack.Screen options={{ title, headerBackTitle: origin }} />
    {request.source === 'task' ? <TasksScreen initialTaskId={request.recordId} />
      : request.source === 'fitness' ? <FitnessScreen initialSessionId={request.recordId} />
        : <FinanceScreen initialView={request.source === 'commitment' ? 'commitments' : 'work'} initialRecordId={request.recordId} initialDueDate={request.date} />}
  </>;
}
