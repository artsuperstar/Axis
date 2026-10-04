import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/database/database-provider';
import { userError } from '@/features/tasks/form';
import { localDateString, monthGridRange } from '@/utils/calendar';

import { createCalendarDataAccess } from './data';
import { moveMonth, returnToToday, selectDate } from './model';
import type { CalendarItem, TaskCalendarItem } from './types';

export function useCalendar() {
  const db = useDatabase();
  const access = useMemo(() => createCalendarDataAccess(db, randomUUID), [db]);
  const [selection, setSelection] = useState(() => selectDate(localDateString(new Date())));
  const [today, setToday] = useState(() => localDateString(new Date()));
  const [snapshot, setSnapshot] = useState<{ month: string; items: CalendarItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const reload = useCallback(() => {
    try {
      setSnapshot({ month: selection.month, items: access.readRange(monthGridRange(selection.month)) });
      setToday(localDateString(new Date()));
      setError(null);
    } catch (cause) {
      setSnapshot(null);
      setError(userError(cause, 'Unable to load Calendar. Please try again.'));
    }
  }, [access, selection.month]);

  useFocusEffect(useCallback(() => {
    reload();
    // Also refresh time-derived recurring states and local midnight while this screen remains open.
    const timer = setInterval(reload, 60000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') reload(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [reload]));

  function toggleTask(item: TaskCalendarItem) {
    try { access.toggleTask(item); setActionError(null); reload(); }
    catch (cause) { setActionError(userError(cause, 'Unable to update this task. Please try again.')); reload(); }
  }

  return { selection, today, items: snapshot?.month === selection.month ? snapshot.items : null, error, actionError, reload, toggleTask,
    onDate: (date: string) => { setActionError(null); setSelection(selectDate(date)); },
    onMove: (direction: -1 | 1) => { setActionError(null); setSelection((current) => moveMonth(current, direction)); },
    onToday: () => { setActionError(null); setSelection(returnToToday(localDateString(new Date()))); reload(); } };
}
