export type HomeRefreshHost = {
  load: () => void; everyMinute: (callback: () => void) => () => void;
  onResume: (callback: (state: string) => void) => () => void;
};
/** Shared lifecycle entry point also lets tests exercise focus/resume/minute cleanup with a fake host. */
export function startHomeRefresh(host: HomeRefreshHost) {
  let active = true;
  const load = () => { if (active) host.load(); };
  load();
  const stopTimer = host.everyMinute(load);
  const stopResume = host.onResume((state) => { if (state === 'active') load(); });
  return () => { active = false; stopTimer(); stopResume(); };
}
