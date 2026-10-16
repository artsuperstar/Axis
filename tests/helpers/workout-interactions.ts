import { act } from 'react';
import type { mount } from './refresh-lifecycle';

type App = Awaited<ReturnType<typeof mount>>;
const menuDismissed = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)));

export async function editWorkoutSet(app: App, name: string, index = 1) {
  const row = app.nodes().find((node) => node.kind === 'Pressable' && String(node.props.accessibilityLabel).startsWith(`${name}, set ${index}.`));
  if (!row) throw new Error(`Missing set row ${index} for ${name}`);
  await app.tapSet(String(row.props.accessibilityLabel));
}

export async function logWorkoutSet(app: App, name: string) {
  const targeted = app.nodes().some((node) => node.kind === 'FormButton' && node.props.accessibilityLabel === `Complete set for ${name}`);
  await app.press(targeted ? `Complete set for ${name}` : `Log set for ${name}`);
}

/** Follow the single logging path for this exercise's mode, then tap the new row. */
export async function completeAndEditWorkoutSet(app: App, name: string) {
  await logWorkoutSet(app, name);
  const count = app.nodes().filter((node) => node.kind === 'Pressable' && String(node.props?.accessibilityLabel).startsWith(`${name}, set `)).length;
  await editWorkoutSet(app, name, count);
}

export async function exerciseMenuAction(app: App, name: string, action: string) {
  await app.press(`More actions for ${name}`);
  await app.press(action);
  await menuDismissed();
}

export async function workoutMenuAction(app: App, action: string) {
  await app.press('More workout actions');
  await app.press(action);
  await menuDismissed();
}
