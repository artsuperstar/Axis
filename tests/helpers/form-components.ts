/// <reference types="node" />

import { createRequire, registerHooks } from 'node:module';
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from 'react';

// Exercise the real shared components with the existing web renderer, without adding a native test runtime.
registerHooks({
  resolve(specifier, context, next) { return next(specifier === 'react-native' ? 'react-native-web' : specifier, context); },
  load(url, context, next) { return url.endsWith('.css') ? { format: 'commonjs', source: '', shortCircuit: true } : next(url, context); },
});
const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require('react-dom/server') as { renderToStaticMarkup: (node: ReactNode) => string };
export const controls = require('../../src/components/form-controls') as typeof import('../../src/components/form-controls');
export const selection = require('../../src/components/form-selection-host') as typeof import('../../src/components/form-selection-host');

export function renderControl(render: () => ReactNode) {
  let tree: ReactNode;
  function Probe() { tree = render(); return tree; }
  const markup = renderToStaticMarkup(createElement(Probe));
  return { markup, elements: elements(tree!) };
}

type ControlProps = { children?: ReactNode; label?: string; onPress?: () => void; accessibilityLabel?: string; disabled?: boolean; style?: { position?: string } };
function elements(node: ReactNode): ReactElement<ControlProps>[] {
  return Children.toArray(node).flatMap((child) => isValidElement<ControlProps>(child) ? [child, ...elements(child.props.children)] : []);
}
