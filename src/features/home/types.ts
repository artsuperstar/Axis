import type { SessionSummary } from '@/features/fitness/types';
import type { TaskPriority } from '@/features/tasks/types';
import type { ScheduledSource, TaskScheduledItem, CommitmentScheduledItem, WorkScheduledItem } from '../scheduled-types';
import type { HomeNavigation, SourceTarget } from '../source-navigation';

export type HomeTaskItem = TaskScheduledItem & { priority: TaskPriority; status: 'Today' | 'Earlier' | 'Missed'; target: SourceTarget };
export type HomeItem = HomeTaskItem | (CommitmentScheduledItem & { target: SourceTarget }) | (WorkScheduledItem & { target: SourceTarget });
export type HomeSection = { source: ScheduledSource; title: string; items: HomeItem[]; total: number; remaining: number; target: HomeNavigation };
export type HomeWorkout = { session: SessionSummary; target: HomeNavigation };
export type HomeSnapshot = {
  date: string; today: HomeSection[]; attention: HomeSection[]; activeWorkout: HomeWorkout | null;
  completedWorkout: HomeWorkout | null; nothingPending: boolean;
};
