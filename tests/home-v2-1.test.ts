/// <reference types="node" />
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { createElement } from 'react';
import { taskDraft } from '../src/features/tasks/form';
import { createHomeDataAccess } from '../src/features/home/data';
import { localDateString, addDays } from '../src/utils/calendar';
import { journalDatabase } from './helpers/journal';
import { mount, runtime, screens } from './helpers/refresh-lifecycle';

const { ReducedMotionContext } = createRequire(import.meta.url)('../src/components/motion') as typeof import('../src/components/motion');
const day = localDateString(new Date());
type App = Awaited<ReturnType<typeof mount>>;
const node = (app: App, id: string) => app.nodes().find(n => n.props?.testID === id)!;
const card = (app: App, id: string) => node(app, 'home-card-' + id);
const tap = (app: App, id: string) => app.tapSet(String(card(app, id).props.accessibilityLabel));
const panels = (app: App) => app.nodes().filter(n => String(n.props?.testID ?? '').startsWith('home-detail-'));

for (const width of [320, 390, 430]) for (const fontScale of [1, 2]) {
  test(`${width}/${fontScale}: disclosure follows its row or its own stacked card, with one live panel and stable identities`, async t => {
    t.mock.method(runtime.native as { useWindowDimensions: () => object }, 'useWindowDimensions', () => ({ width, height: 844, scale: 1, fontScale }));
    const f = await journalDatabase(); f.setTime(day); t.after(() => f.sqlite.close());
    f.tasks.createTask({ ...taskDraft(), title: 'Real scheduled task', date: day });
    f.tasks.createTask({ ...taskDraft(), title: 'Real earlier task', date: addDays(day, -1) });
    const app = await mount(createElement(screens.HomeScreen), f.db); t.after(app.unmount);
    const original = ['today', 'attention', 'fitness', 'journal'].map(id => card(app, id));
    const reads = runtime.fixture.reads.length;
    for (const id of ['today', 'attention', 'today', 'attention']) {
      await tap(app, id);
      assert.equal(panels(app).length, 1);
      const order = app.nodes(), detail = node(app, 'home-detail-' + id);
      assert.ok(order.indexOf(detail) > order.indexOf(card(app, id)));
      assert.ok(order.indexOf(detail) < order.indexOf(card(app, 'fitness')));
      if (fontScale === 2 || width === 320) {
        if (id === 'today') assert.ok(order.indexOf(detail) < order.indexOf(card(app, 'attention')));
      } else assert.ok(order.indexOf(detail) > order.indexOf(card(app, 'attention')));
      assert.equal((card(app, id).props.accessibilityState as { expanded: boolean }).expanded, true);
      assert.equal(card(app, 'fitness').props.accessibilityState, undefined);
      assert.equal(card(app, 'journal').props.accessibilityState, undefined);
      assert.deepEqual(['today', 'attention', 'fitness', 'journal'].map(id => card(app, id)), original);
    }
    await tap(app, 'attention'); assert.equal(panels(app).length, 0);
    await tap(app, 'today'); await tap(app, 'today'); assert.equal(panels(app).length, 0);
    assert.equal(runtime.fixture.reads.length, reads, 'disclosure performs no source reads');
    await tap(app, 'today'); await app.refocus(); assert.equal(node(app, 'home-detail-today'), panels(app)[0]);
    assert.equal(panels(app).length, 1);
  });
}

for (const reduced of [false, true]) test(`disclosure reflow respects Reduced Motion=${reduced} and navigation does not animate Home`, async t => {
  const f = await journalDatabase(); f.setTime(day); t.after(() => f.sqlite.close());
  const app = await mount(createElement(ReducedMotionContext.Provider, { value: reduced }, createElement(screens.HomeScreen)), f.db); t.after(app.unmount);
  const start = runtime.fixture.layoutAnimations.length;
  await tap(app, 'today'); await tap(app, 'attention'); await tap(app, 'attention');
  assert.equal(runtime.fixture.layoutAnimations.length - start, reduced ? 0 : 3);
  const after = runtime.fixture.layoutAnimations.length;
  await tap(app, 'fitness'); await tap(app, 'journal');
  assert.equal(runtime.fixture.layoutAnimations.length, after);
  assert.equal(panels(app).length, 0);
  assert.deepEqual(runtime.fixture.navigation, [
    { method: 'navigate', target: { pathname: '/(tabs)/fitness' } },
    { method: 'push', target: { pathname: '/journal' } },
  ]);
  assert.equal(createHomeDataAccess(f.db, randomUUID, f.now).read().activeWorkout, null, 'navigation never starts a workout');
});
