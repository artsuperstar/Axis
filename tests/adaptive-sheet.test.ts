/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ModalProps, ViewStyle } from 'react-native';

import { adaptiveSheetLayout, focusedFieldScroll, sheetViewportLayout } from '../src/components/adaptive-sheet-layout';
import { commitmentForms, financeCategories, recurringTasks, renderControl, sheets, taskCategories, taskForms, taskHistory, transactionForms, workForms } from './helpers/form-components';

test('short and medium sheets wrap measured header/content while long content scrolls at the usable maximum', () => {
  assert.deepEqual(adaptiveSheetLayout(64, 160, 700), { height: 224, bodyHeight: 160, scroll: false, top: 476, bottom: 700, paddingBottom: 0 });
  assert.deepEqual(adaptiveSheetLayout(64, 420, 700), { height: 484, bodyHeight: 420, scroll: false, top: 216, bottom: 700, paddingBottom: 0 });
  assert.deepEqual(adaptiveSheetLayout(64, 1000, 700), { height: 700, bodyHeight: 636, scroll: true, top: 0, bottom: 700, paddingBottom: 0 });
});

test('errors, new sections, history, and larger text recalculate the content-driven target height', () => {
  const short = adaptiveSheetLayout(64, 160, 700);
  const errors = adaptiveSheetLayout(64, 220, 700);
  const large = adaptiveSheetLayout(128, 800, 700);
  assert.ok(errors.height > short.height); assert.equal(large.height, 700); assert.equal(large.scroll, true);
  assert.deepEqual(adaptiveSheetLayout(64, 160, 700), short, 'removing extra content restores the natural height');
});

test('keyboard bounds respect window origin and already resized Android viewports without subtracting twice', () => {
  const full = sheetViewportLayout(760, 40, null, 0, 34, 8);
  const keyboard = sheetViewportLayout(760, 40, 400, 0, 34, 8);
  const resized = sheetViewportLayout(360, 40, 400, 0, 34, 8);
  assert.deepEqual(full, { top: 8, bottom: 760, height: 752, bottomInset: 34 });
  assert.deepEqual(keyboard, { top: 8, bottom: 360, height: 352, bottomInset: 0 });
  assert.deepEqual(resized, keyboard);
  const clipped = adaptiveSheetLayout(64, 500, keyboard.height, keyboard.bottomInset);
  assert.equal(clipped.height, 352); assert.equal(clipped.scroll, true);
  assert.equal(40 + keyboard.top + clipped.bottom, 400);
  assert.equal(adaptiveSheetLayout(64, 500, full.height, full.bottomInset).height, 598);
});

test('short and medium sheets move only their top edge while their bottom equals the physical viewport bottom', () => {
  const viewport = sheetViewportLayout(844, 0, null, 44, 34, 8);
  const short = adaptiveSheetLayout(64, 160, viewport.height, viewport.bottomInset);
  const medium = adaptiveSheetLayout(64, 420, viewport.height, viewport.bottomInset);
  assert.ok(short.top > medium.top); assert.equal(short.height, 64 + 160 + 34);
  assert.equal(short.bottom, medium.bottom);
  for (const layout of [short, medium]) {
    assert.equal(viewport.top + layout.top + layout.height, 844);
    assert.equal(layout.bodyHeight, layout.height - 64 - 34);
    assert.equal(layout.scroll, false);
  }
});

test('long content reaches the allowed top boundary, includes the bottom inset, and scrolls inside its maximum', () => {
  const viewport = sheetViewportLayout(844, 0, null, 44, 34, 8);
  const layout = adaptiveSheetLayout(64, 1500, viewport.height, viewport.bottomInset);
  assert.equal(layout.top, 0); assert.equal(layout.height, viewport.height);
  assert.equal(viewport.top + layout.top, 44 + 8);
  assert.equal(viewport.top + layout.height, 844);
  assert.equal(layout.bodyHeight, viewport.height - 64 - 34); assert.equal(layout.scroll, true);
});

test('safe-area padding is inside the sheet background and never leaves a parent-screen region below it', () => {
  for (const bottomInset of [0, 24, 34]) {
    const viewport = sheetViewportLayout(844, 0, null, 44, bottomInset, 8);
    for (const content of [0, 160, 420, 1500]) {
      const layout = adaptiveSheetLayout(64, content, viewport.height, viewport.bottomInset);
      const sheetTop = viewport.top + layout.top;
      const sheetBottom = sheetTop + layout.height;
      const bodyBottom = sheetTop + 64 + layout.bodyHeight;
      assert.equal(sheetBottom, viewport.bottom);
      assert.equal(viewport.bottom - sheetBottom, 0, 'no exposed parent region below the sheet');
      assert.equal(sheetBottom - bodyBottom, bottomInset, 'the home-indicator space belongs to the sheet background');
    }
  }
});

test('keyboard opening and closing retain bottom anchoring and restore natural height without a bottom gap', () => {
  const normal = sheetViewportLayout(844, 0, null, 44, 34, 8);
  const restored = sheetViewportLayout(844, 0, null, 44, 34, 8);
  assert.deepEqual(restored, normal);
  for (const content of [160, 500, 1500]) {
    const original = adaptiveSheetLayout(64, content, normal.height, normal.bottomInset);
    const viewport = sheetViewportLayout(844, 0, 400, 44, 34, 8);
    const keyboard = adaptiveSheetLayout(64, content, viewport.height, viewport.bottomInset);
    assert.equal(viewport.top + keyboard.top + keyboard.height, 400);
    assert.equal(keyboard.paddingBottom, 0);
    assert.equal(keyboard.scroll, 64 + content > viewport.height);
    assert.deepEqual(adaptiveSheetLayout(64, content, restored.height, restored.bottomInset), original);
  }
});

test('modal covers system-bar regions and the sheet background reaches the full width with square bottom corners', () => {
  const modal = renderControl(() => sheets.AdaptiveModal({ children: null, onDismiss: () => {} }));
  const props = modal.elements[0].props as ModalProps;
  assert.equal(props.transparent, true); assert.equal(props.statusBarTranslucent, true); assert.equal(props.navigationBarTranslucent, true);
  const sheet = renderControl(() => sheets.AdaptiveSheet({ title: 'Details', children: null, onDismiss: () => {} }));
  const style = Object.assign({}, ...sheet.elements[0].props.style as ViewStyle[]) as ViewStyle;
  assert.equal(style.width, '100%'); assert.equal(style.maxWidth, undefined);
  assert.ok(style.backgroundColor); assert.equal(style.borderRadius ?? 0, 0);
  assert.equal(style.borderBottomLeftRadius ?? 0, 0); assert.equal(style.borderBottomRightRadius ?? 0, 0);
});

test('focused fields scroll into the measured body and visible fields keep their offset', () => {
  assert.equal(focusedFieldScroll(100, 450, 48, 100, 300, 8), 206);
  assert.equal(focusedFieldScroll(100, 200, 48, 100, 300, 8), 100);
  assert.equal(focusedFieldScroll(100, 50, 48, 100, 300, 8), 42);
  assert.equal(focusedFieldScroll(100, 450, 250, 100, 100, 8), 442, 'a tall input reveals its top instead of oscillating');
});

test('Work and Commitments export the same shared modal and sheet implementations', () => {
  assert.equal(workForms.WorkModal, sheets.AdaptiveModal); assert.equal(workForms.WorkSheet, sheets.AdaptiveSheet);
  assert.equal(commitmentForms.CommitmentModal, sheets.AdaptiveModal); assert.equal(commitmentForms.CommitmentSheet, sheets.AdaptiveSheet);
});

test('Task/Transaction editors and both category managers use the shared adaptive modal and sheet', () => {
  const forms = [
    () => taskForms.TaskEditor({ task: null, recurrence: null, categories: [], onSave: () => {}, onCreateCategory: () => { throw Error(); }, onDismiss: () => {} }),
    () => transactionForms.TransactionEditor({ transaction: null, categories: [], onSave: () => {}, onCreateCategory: () => { throw Error(); }, onDismiss: () => {} }),
    () => taskCategories.CategoryManager({ categories: [], onCreate: () => {}, onDelete: () => {}, onDismiss: () => {} }),
    () => financeCategories.FinanceCategoryManager({ categories: [], onCreate: () => {}, onDelete: () => {}, onDismiss: () => {} }),
    () => recurringTasks.RecurringTasks({ tasks: [], recurrences: [], onEdit: () => {}, onHistory: () => {}, onDismiss: () => {}, visible: true, onClosed: () => {} }),
    () => taskHistory.OccurrenceHistory({ task: { title: 'Task' } as Parameters<typeof taskHistory.OccurrenceHistory>[0]['task'], now: 1,
      readPage: () => ({ occurrences: [], nextBefore: null }), onStatus: () => { throw Error(); }, onDismiss: () => {} }),
  ];
  for (const render of forms) {
    const result = renderControl(render);
    assert.equal(result.elements[0].type, sheets.AdaptiveModal);
    assert.ok(result.elements.some((element) => element.type === sheets.AdaptiveSheet));
  }
});
