import { validDate } from '@/utils/calendar';

export type SourceRequest =
  | { source: 'task'; recordId: string; date: string }
  | { source: 'commitment' | 'work'; recordId?: string; date?: string }
  | { source: 'fitness'; recordId: string };
export type SourceTarget = { pathname: '/home-source'; params: SourceRequest };
export type HomeNavigation = SourceTarget | { pathname: '/(tabs)/tasks' | '/(tabs)/calendar' | '/(tabs)/finance' | '/(tabs)/fitness' | '/journal' };
export function sourceRequest(params: { source?: unknown; recordId?: unknown; date?: unknown }, origin: 'Home' | 'Calendar'): SourceRequest | null {
  const { source, recordId, date } = params;
  if (recordId !== undefined && (typeof recordId !== 'string' || !recordId)) return null;
  if (date !== undefined && (typeof date !== 'string' || !validDate(date))) return null;
  if (source === 'fitness') return origin === 'Home' && typeof recordId === 'string' ? { source, recordId } : null;
  if (source !== 'task' && source !== 'commitment' && source !== 'work') return null;
  if (source === 'task') return typeof recordId === 'string' && typeof date === 'string' ? { source, recordId, date } : null;
  if ((origin === 'Calendar' || recordId !== undefined) && (typeof recordId !== 'string' || typeof date !== 'string')) return null;
  return { source, recordId: recordId as string | undefined, date: date as string | undefined };
}
