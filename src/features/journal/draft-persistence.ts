export const journalDraftDebounceMs = 500;
export const journalDraftMaximumWaitMs = 2000;
export type DraftTimerHost = { later: (milliseconds: number, callback: () => void) => () => void };
const timers: DraftTimerHost = { later: (milliseconds, callback) => {
  const timer = setTimeout(callback, milliseconds);
  return () => clearTimeout(timer);
} };

/** Read the latest editor state when flushing; cancelled callbacks cannot recreate an old draft. */
export function createDraftPersistence(write: () => boolean, host = timers) {
  let trailing: (() => void) | null = null;
  let maximum: (() => void) | null = null;
  let cycle = 0; let revision = 0;
  function cancel() {
    cycle++; revision++;
    trailing?.(); maximum?.(); trailing = null; maximum = null;
  }
  function flush() { cancel(); return write(); }
  return {
    cancel,
    flush,
    changed() {
      if (!maximum) {
        const generation = cycle;
        maximum = host.later(journalDraftMaximumWaitMs, () => { if (generation === cycle && maximum) flush(); });
      }
      trailing?.();
      const generation = ++revision;
      trailing = host.later(journalDraftDebounceMs, () => { if (generation === revision && trailing) flush(); });
    },
  };
}

export type JournalLifecycleHost = {
  refresh: () => void; flush: () => boolean;
  everyMinute: (callback: () => void) => () => void;
  onAppState: (callback: (state: string) => void) => () => void;
};
/** Background/inactive and blur are opportunities to flush, not guarantees of a termination callback. */
export function startJournalLifecycle(host: JournalLifecycleHost) {
  let mounted = true; let foreground = true;
  const refresh = () => { if (mounted && foreground) host.refresh(); };
  refresh();
  const stopTimer = host.everyMinute(refresh);
  const stopAppState = host.onAppState((state) => {
    if (!mounted) return;
    foreground = state === 'active';
    if (foreground) refresh(); else host.flush();
  });
  return () => { mounted = false; stopTimer(); stopAppState(); host.flush(); };
}
