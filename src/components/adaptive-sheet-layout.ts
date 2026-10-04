/** Measure the whole modal window. Reserve space above the sheet, never below its background. */
export function sheetViewportLayout(viewportHeight: number, viewportTop: number, keyboardTop: number | null, topInset: number, bottomInset: number, topGap: number) {
  // Android may have already resized the window; intersect bounds rather than subtracting the keyboard twice.
  const bottom = keyboardTop === null ? Math.max(0, viewportHeight) : Math.min(Math.max(0, viewportHeight), Math.max(0, keyboardTop - viewportTop));
  const top = Math.min(bottom, Math.max(0, topInset) + Math.max(0, topGap));
  return { top, bottom, height: bottom - top, bottomInset: keyboardTop === null ? Math.max(0, bottomInset) : 0 };
}

export function adaptiveSheetLayout(headerHeight: number, contentHeight: number, maximumHeight: number, bottomInset = 0) {
  const bottom = Math.max(0, maximumHeight);
  const paddingBottom = Math.min(bottom, Math.max(0, bottomInset));
  const height = Math.min(bottom, Math.max(0, headerHeight) + Math.max(0, contentHeight) + paddingBottom);
  const bodyHeight = Math.max(0, height - headerHeight - paddingBottom);
  return { height, bodyHeight, scroll: contentHeight > bodyHeight + 1, top: bottom - height, bottom, paddingBottom };
}

export function focusedFieldScroll(offset: number, inputTop: number, inputHeight: number, bodyTop: number, bodyHeight: number, gap: number) {
  if (inputHeight > bodyHeight - gap * 2) return Math.max(0, offset + inputTop - bodyTop - gap);
  if (inputTop < bodyTop + gap) return Math.max(0, offset + inputTop - bodyTop - gap);
  return Math.max(0, offset + Math.max(0, inputTop + inputHeight - (bodyTop + bodyHeight - gap)));
}
