/// <reference types="node" />

import { createRequire, registerHooks } from 'node:module';
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from 'react';

// Exercise the real shared components with the existing web renderer, without adding a native test runtime.
registerHooks({
  resolve(specifier, context, next) {
    // Match Metro's web resolution for the safe-area package's native implementation boundaries.
    if (context.parentURL?.includes('react-native-safe-area-context') && ['./SafeAreaView', './NativeSafeAreaProvider'].includes(specifier)) return next(`${specifier}.web`, context);
    const target = specifier === 'react-native' ? 'react-native-web' : specifier === '@react-native-community/datetimepicker'
      ? new URL('./date-time-picker.cjs', import.meta.url).href : specifier;
    return next(target, context);
  },
  load(url, context, next) { return url.endsWith('.css') ? { format: 'commonjs', source: '', shortCircuit: true } : next(url, context); },
});
const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require('react-dom/server') as { renderToStaticMarkup: (node: ReactNode) => string };
export const controls = require('../../src/components/form-controls') as typeof import('../../src/components/form-controls');
export const selection = require('../../src/components/form-selection-host') as typeof import('../../src/components/form-selection-host');
export const autocomplete = require('../../src/components/autocomplete-field') as typeof import('../../src/components/autocomplete-field');
export const sheets = require('../../src/components/adaptive-sheet') as typeof import('../../src/components/adaptive-sheet');
export const commitmentForms = require('../../src/features/finance/commitments/components/commitment-forms') as typeof import('../../src/features/finance/commitments/components/commitment-forms');
export const taskForms = require('../../src/features/tasks/components/task-editor') as typeof import('../../src/features/tasks/components/task-editor');
export const taskCategories = require('../../src/features/tasks/components/category-manager') as typeof import('../../src/features/tasks/components/category-manager');
export const financeCategories = require('../../src/features/finance/components/category-manager') as typeof import('../../src/features/finance/components/category-manager');
export const taskHistory = require('../../src/features/tasks/components/occurrence-history') as typeof import('../../src/features/tasks/components/occurrence-history');
export const recurringTasks = require('../../src/features/tasks/components/recurring-tasks') as typeof import('../../src/features/tasks/components/recurring-tasks');
export const workForms = require('../../src/features/finance/work/components/work-forms') as typeof import('../../src/features/finance/work/components/work-forms');
export const workViews = require('../../src/features/finance/work/components/work-view') as typeof import('../../src/features/finance/work/components/work-view');
export const transactionForms = require('../../src/features/finance/components/transaction-editor') as typeof import('../../src/features/finance/components/transaction-editor');
export const transactionRows = require('../../src/features/finance/components/transaction-row') as typeof import('../../src/features/finance/components/transaction-row');

export function renderControl(render: () => ReactNode) {
  let tree: ReactNode;
  function Probe() { tree = render(); return tree; }
  const markup = renderToStaticMarkup(createElement(controls.FormSelectionHost, null, createElement(Probe)));
  return { markup, elements: elements(tree!) };
}

type ControlProps = { children?: ReactNode; label?: string; onPress?: () => void; accessibilityLabel?: string; disabled?: boolean; editable?: boolean;
  style?: { position?: string }; value?: string | number | null; options?: { value: string | number | null; label: string }[]; helperText?: string;
  getResults?: (query: string) => import('../../src/components/autocomplete-field').AutocompleteResults<string | null>;
  onCreate?: (name: string) => string; onSelect?: (value: string | null) => void;
  action?: import('../../src/components/form-selection-host').SelectionInlineAction;
};
function elements(node: ReactNode): ReactElement<ControlProps>[] {
  return Children.toArray(node).flatMap((child) => isValidElement<ControlProps>(child) ? [child, ...elements(child.props.children)] : []);
}
