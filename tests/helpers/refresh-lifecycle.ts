/// <reference types="node" />

import assert from 'node:assert/strict';
import { Module, createRequire, registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { act, type ComponentType, type ReactNode } from 'react';

const require = createRequire(import.meta.url);
require('./lifecycle-dom.cjs');
const boundary = require('./lifecycle-native.cjs') as {
  fixture: { db: unknown; failures: Set<string>; reads: string[]; navigation: { method: string; target: unknown }[];
    alerts: { title: string; message: string; buttons: { text: string; onPress?: () => void; style?: string }[] }[];
    wrap: (kind: string, access: unknown) => unknown }; resume: () => void; refocus: () => void;
} & Record<string, unknown>;
const boundaries: Record<string, string> = {
  'react-native': 'native', 'expo-router': 'router', 'expo-crypto': 'crypto', 'react-native-safe-area-context': 'safeArea',
  '@react-native-community/datetimepicker': 'picker',
  'react-native-screens/experimental': 'screenSafeArea',
  '@/database/database-provider': 'database', '@/components/form-controls': 'controls', './form-controls': 'controls',
  '@/components/form-selection-host': 'selection', './form-selection-host': 'selection',
  '@/components/autocomplete-field': 'autocomplete', '@/components/themed-text': 'themedText', './themed-text': 'themedText',
};
function cachedModule(url: URL, exports: unknown) {
  const path = fileURLToPath(url);
  if (!require.cache[path]) {
    const cached = new Module(path); cached.filename = path; cached.loaded = true; cached.exports = exports;
    require.cache[path] = cached;
  }
  return { url: url.href, shortCircuit: true as const };
}
registerHooks({
  resolve(specifier, context, next) {
    const key = boundaries[specifier];
    if (key) return cachedModule(new URL(`./lifecycle-boundary-${key}.cjs`, import.meta.url), boundary[key]);
    const kind = context.parentURL?.includes('/use-finance.') ? ({ './data': 'finance', './work/data': 'work', './commitments/data': 'commitments' } as Record<string, string>)[specifier]
      : context.parentURL?.includes('/use-fitness.') && specifier === './data' ? 'fitness' : undefined;
    if (kind) {
      const real = require(fileURLToPath(next(specifier, context).url));
      const names: Record<string, string> = { finance: 'createFinanceDataAccess', work: 'createWorkDataAccess', commitments: 'createCommitmentDataAccess', fitness: 'createFitnessDataAccess' };
      const name = names[kind];
      return cachedModule(new URL(`./lifecycle-access-${kind}.cjs`, import.meta.url), { [name]: (...args: unknown[]) => boundary.fixture.wrap(kind, real[name](...args)) });
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.css')) return { format: 'commonjs', source: '', shortCircuit: true };
    return next(url, context);
  },
});

export const screens = {
  HomeScreen: require('../../src/features/home/home-screen').HomeScreen as ComponentType,
  FinanceScreen: require('../../src/features/finance/finance-screen').FinanceScreen as ComponentType<NonNullable<Parameters<typeof import('../../src/features/finance/finance-screen').FinanceScreen>[0]>>,
  FitnessScreen: require('../../src/features/fitness/fitness-screen').FitnessScreen as ComponentType<NonNullable<Parameters<typeof import('../../src/features/fitness/fitness-screen').FitnessScreen>[0]>>,
};
export const hooks = {
  useFinance: require('../../src/features/finance/use-finance').useFinance as typeof import('../../src/features/finance/use-finance').useFinance,
  useFitness: require('../../src/features/fitness/use-fitness').useFitness as typeof import('../../src/features/fitness/use-fitness').useFitness,
};
export const runtime = boundary;
type Host = { kind?: string; props: Record<string, unknown>; childNodes: Host[]; parentNode: Host | null; textContent: string };
const { createRoot } = require('react-dom/client') as { createRoot: (container: unknown) => { render: (node: ReactNode) => void; unmount: () => void } };
export async function mount(node: ReactNode, db: unknown, failures: string[] = []) {
  boundary.fixture.db = db; boundary.fixture.failures.clear(); failures.forEach((failure) => boundary.fixture.failures.add(failure));
  boundary.fixture.alerts.length = 0; boundary.fixture.navigation.length = 0; boundary.fixture.reads.length = 0;
  const container = document.createElement('div') as unknown as Host;
  const root = createRoot(container);
  await act(() => root.render(node));
  function nodes(parent = container): Host[] { return parent.childNodes.flatMap((child) => [child, ...nodes(child)]); }
  function find(kind: string, label?: string) {
    const all = nodes().filter((node) => node.kind === kind && (!label || node.props.label === label || node.props.accessibilityLabel === label));
    const inModal = all.filter((node) => {
      for (let parent = node.parentNode; parent; parent = parent.parentNode) if (parent.kind === 'Modal') return true;
      return false;
    });
    const matches = inModal.length ? inModal : all;
    assert.equal(matches.length, 1, `Expected one ${kind} ${label ?? ''}, found ${matches.length}`);
    return matches[0];
  }
  return { container, nodes, find,
    async tapSet(label: string) { await act(() => (find('Pressable', label).props.onPress as () => void)()); },
    async confirm(text: string) {
      const alert = boundary.fixture.alerts.at(-1); assert.ok(alert, 'Expected a confirmation');
      const button = alert.buttons.find((option) => option.text === text); assert.ok(button, `Missing confirmation ${text}`);
      await act(() => button.onPress?.());
    },
    async press(label: string) { const button = find('FormButton', label); assert.ok(!button.props.disabled); await act(() => (button.props.onPress as () => void)()); },
    async change(label: string, value: string) { await act(() => (find('FormField', label).props.onChangeText as (value: string) => void)(value)); },
    async resume() { await act(boundary.resume); }, async refocus() { await act(boundary.refocus); },
    async unmount() { await act(() => root.unmount()); },
  };
}
