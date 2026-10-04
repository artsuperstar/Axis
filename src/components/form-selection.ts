export type SelectionValue = string | number | null;
export type SelectionOption<T extends SelectionValue> = { value: T; label: string; disabled?: boolean };
export type SelectionRect = { x: number; y: number; width: number; height: number };

/** Window measurements are translated into the modal host's own usable coordinates. */
export function selectionMenuLayout(anchor: SelectionRect, host: SelectionRect, desiredHeight: number, retainCoveredAnchor = false) {
  const inset = 8;
  const gap = 4;
  if (host.width <= inset * 2 || host.height <= inset * 2 || anchor.width <= 0 || anchor.height <= 0) return null;
  const x = anchor.x - host.x;
  const measuredY = anchor.y - host.y;
  if (x + anchor.width <= 0 || x >= host.width) return null;
  if (!retainCoveredAnchor && (measuredY + anchor.height <= 0 || measuredY >= host.height)) return null;
  // An inline form owns keyboard focus. Keep its original anchor usable as the keyboard resizes the modal.
  const y = retainCoveredAnchor ? Math.max(inset, Math.min(measuredY, host.height - anchor.height - inset)) : measuredY;
  const width = Math.min(anchor.width, host.width - inset * 2);
  const below = Math.max(0, host.height - inset - (y + anchor.height + gap));
  const above = Math.max(0, y - gap - inset);
  const placement = below >= desiredHeight || below >= above ? 'below' : 'above';
  // A keyboard-focused form may overlap its trigger when neither side has enough room for its controls.
  const availableHeight = retainCoveredAnchor ? host.height - inset * 2 : placement === 'below' ? below : above;
  const height = Math.min(Math.max(1, desiredHeight), availableHeight);
  if (height <= 0) return null;
  return {
    left: Math.max(inset, Math.min(x, host.width - width - inset)),
    top: Math.max(inset, Math.min(placement === 'below' ? y + anchor.height + gap : y - gap - height, host.height - height - inset)),
    width, height, placement,
  };
}

export type SelectionOverlayState<Menu, Inline> = { menu: Menu | null; inline: Inline | null };
export type SelectionOverlayEvent<Menu, Inline> =
  | { type: 'open'; menu: Menu }
  | { type: 'inline'; content: Inline }
  | { type: 'cancel-inline' }
  | { type: 'close' };

/** Opening another field replaces the entire interaction; cancelling an action retains its options. */
export function selectionOverlayReducer<Menu, Inline>(state: SelectionOverlayState<Menu, Inline>, event: SelectionOverlayEvent<Menu, Inline>): SelectionOverlayState<Menu, Inline> {
  switch (event.type) {
    case 'open': return { menu: event.menu, inline: null };
    case 'inline': return state.menu ? { ...state, inline: event.content } : state;
    case 'cancel-inline': return { ...state, inline: null };
    case 'close': return { menu: null, inline: null };
  }
}

/** Feature callbacks still own validation, persistence, selection and their error wording. */
export function submitInlineName(name: string, submit: (name: string, complete: () => void) => void, complete: () => void, formatError: (cause: unknown) => string): string | null {
  try { submit(name, complete); return null; }
  catch (cause) { return formatError(cause); }
}

export function submitAutocompleteSelection<T extends SelectionValue>(query: string, create: (name: string) => T, select: (value: T) => void,
  close: () => void, formatError: (cause: unknown) => string) {
  return submitInlineName(query, (name, complete) => { select(create(name)); complete(); }, close, formatError);
}
