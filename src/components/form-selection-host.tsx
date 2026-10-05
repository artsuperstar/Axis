import { createContext, useCallback, useContext, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode, type Ref } from 'react';
import { AccessibilityInfo, Keyboard, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type KeyboardEvent as NativeKeyboardEvent, type ScrollViewProps, type TextInput } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Space, SurfaceColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { selectionMenuLayout, selectionOverlayReducer, type SelectionOverlayState } from './form-selection';

type CloseMenu = (restoreFocus?: boolean) => boolean;
type MenuRequest = { id: string; label: string; trigger: View; estimatedHeight: number; content: ReactNode; keyboardInput?: boolean };
export type InlineActionControls = { title: string; onCancel: () => void; onComplete: () => void; onSize: (height: number) => void };
export type SelectionInlineAction = { label: string; title: string; accessibilityLabel?: string; render: (controls: InlineActionControls) => ReactNode };
type InlineRequest = { title: string; content: ReactNode };
type FormSelectionContextValue = { activeId: string | null; open: (menu: MenuRequest) => void; close: CloseMenu; beginInline: (action: SelectionInlineAction) => void; reposition: () => void };
const SelectionContext = createContext<FormSelectionContextValue | null>(null);
const zeroInsets = { top: 0, left: 0, right: 0, bottom: 0 };
export type FormSelectionHandle = { dismiss: CloseMenu };

export function useFormSelection() {
  const context = useContext(SelectionContext);
  if (!context) throw new Error('SelectField must be inside a FormSelectionHost in its editor modal.');
  return context;
}

export function focusFormControl(target: View | TextInput | null) {
  if (!target) return;
  if (Platform.OS === 'web') target.focus();
  else AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
}

/** One overlay per editor, inside the existing native modal and outside its ScrollViews. */
export function FormSelectionHost({ children, ref }: { children: ReactNode; ref?: Ref<FormSelectionHandle> }) {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext) ?? zeroInsets;
  const host = useRef<View>(null);
  const heading = useRef<View>(null);
  const panel = useRef<View>(null);
  const request = useRef<MenuRequest | null>(null);
  const returnFocus = useRef<View | null>(null);
  const measurement = useRef(0);
  const inlineRevision = useRef(0);
  const contentHeight = useRef(0);
  const headingHeight = useRef(40);
  const keyboardTop = useRef<number | null>(null);
  const retainCoveredAnchor = useRef(false);
  const [{ menu, inline }, dispatch] = useReducer(selectionOverlayReducer<MenuRequest, InlineRequest>, { menu: null, inline: null } as SelectionOverlayState<MenuRequest, InlineRequest>);
  const [layout, setLayout] = useState<ReturnType<typeof selectionMenuLayout>>(null);

  const close = useCallback<CloseMenu>((restoreFocus = true) => {
    if (!request.current) return false;
    returnFocus.current = restoreFocus ? request.current.trigger : null;
    request.current = null;
    keyboardTop.current = null;
    measurement.current++;
    inlineRevision.current++;
    Keyboard.dismiss();
    dispatch({ type: 'close' }); setLayout(null);
    return true;
  }, []);

  const reposition = useCallback(() => {
    const current = request.current;
    const surface = host.current;
    if (!current || !surface) return;
    const revision = ++measurement.current;
    surface.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      current.trigger.measureInWindow((anchorX, anchorY, anchorWidth, anchorHeight) => {
        if (request.current !== current || measurement.current !== revision) return;
        // Native measurements can be transiently empty during modal/keyboard layout. Preserve the current form.
        if (anchorWidth <= 0 || anchorHeight <= 0 || measuredWidth <= 16 || measuredHeight <= 16) return;
        // The host now reaches the physical bottom for sheet coverage; menus still respect all safe-area edges.
        const usableBottom = keyboardTop.current == null ? measuredHeight - insets.bottom : Math.min(measuredHeight, Math.max(0, keyboardTop.current - y));
        const next = selectionMenuLayout({ x: anchorX, y: anchorY, width: anchorWidth, height: anchorHeight },
          { x: x + insets.left, y: y + insets.top, width: measuredWidth - insets.left - insets.right, height: usableBottom - insets.top },
          Math.min(contentHeight.current, 360 * Math.max(1, fontScale)), retainCoveredAnchor.current);
        if (!next && !retainCoveredAnchor.current) close();
        else if (!next) return;
        else setLayout({ ...next, left: next.left + insets.left, top: next.top + insets.top });
      });
    });
  }, [close, fontScale, insets]);

  const open = useCallback((next: MenuRequest) => {
    if (!next.keyboardInput) Keyboard.dismiss();
    returnFocus.current = null;
    request.current = next;
    keyboardTop.current = next.keyboardInput ? Keyboard.metrics?.()?.screenY ?? null : null;
    retainCoveredAnchor.current = !!next.keyboardInput;
    contentHeight.current = next.estimatedHeight;
    measurement.current++;
    inlineRevision.current++;
    setLayout(null); dispatch({ type: 'open', menu: next });
  }, []);
  const cancelInline = useCallback(() => {
    Keyboard.dismiss();
    if (!request.current) return;
    inlineRevision.current++;
    contentHeight.current = request.current.estimatedHeight;
    dispatch({ type: 'cancel-inline' });
  }, []);
  const beginInline = useCallback((action: SelectionInlineAction) => {
    const current = request.current;
    if (!current) return;
    const revision = ++inlineRevision.current;
    retainCoveredAnchor.current = true;
    contentHeight.current = 240 * Math.max(1, fontScale);
    const isCurrent = () => request.current === current && inlineRevision.current === revision;
    const content = action.render({ title: action.title, onCancel: () => { if (isCurrent()) cancelInline(); }, onComplete: () => { if (isCurrent()) close(); }, onSize: (naturalHeight) => {
      if (!isCurrent()) return;
      contentHeight.current = naturalHeight + headingHeight.current + 2;
      reposition();
    } });
    dispatch({ type: 'inline', content: { title: action.title, content } });
  }, [cancelInline, close, fontScale, reposition]);
  const context = useMemo(() => ({ activeId: menu?.id ?? null, open, close, beginInline, reposition }), [menu?.id, open, close, beginInline, reposition]);
  useImperativeHandle(ref, () => ({ dismiss: close }), [close]);

  useLayoutEffect(() => { reposition(); }, [menu, inline, width, height, fontScale, reposition]);
  useEffect(() => {
    if (!menu) return;
    const update = (event: NativeKeyboardEvent) => { keyboardTop.current = event.endCoordinates.screenY; reposition(); };
    const listeners = [Keyboard.addListener('keyboardDidShow', update), Keyboard.addListener('keyboardDidHide', () => { keyboardTop.current = null; reposition(); })];
    if (Platform.OS === 'ios') listeners.push(Keyboard.addListener('keyboardWillChangeFrame', update), Keyboard.addListener('keyboardDidChangeFrame', update));
    return () => listeners.forEach((listener) => listener.remove());
  }, [menu, reposition]);
  const ready = !!layout;
  useEffect(() => {
    if (menu && (!ready || inline)) return;
    const frame = requestAnimationFrame(() => {
      focusFormControl(menu ? heading.current : returnFocus.current);
      if (!menu) returnFocus.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [menu, inline, ready]);
  useEffect(() => () => { request.current = null; measurement.current++; }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !menu) return;
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      const element = panel.current as unknown as HTMLElement | null;
      const targets = Array.from(element?.querySelectorAll<HTMLElement>('[tabindex="0"]:not([aria-disabled="true"]), button:not(:disabled), input:not(:disabled), textarea:not(:disabled)') ?? []);
      if (!targets.length) return;
      const index = targets.indexOf(document.activeElement as HTMLElement);
      let next: number;
      if (event.key === 'Tab') next = index < 0 ? event.shiftKey ? targets.length - 1 : 0 : (index + (event.shiftKey ? -1 : 1) + targets.length) % targets.length;
      else if (!inline && event.key === 'ArrowDown') next = index < 0 ? 0 : (index + 1) % targets.length;
      else if (!inline && event.key === 'ArrowUp') next = index < 0 ? targets.length - 1 : (index - 1 + targets.length) % targets.length;
      else if (!inline && event.key === 'Home') next = 0;
      else if (!inline && event.key === 'End') next = targets.length - 1;
      else return;
      event.preventDefault(); targets[next].focus();
    }
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [menu, inline, close]);

  return <SelectionContext.Provider value={context}>
    <View ref={host} collapsable={false} style={styles.container} onLayout={reposition}>
      <View style={styles.container} pointerEvents={menu ? 'none' : 'auto'} aria-hidden={!!menu} accessibilityElementsHidden={!!menu} importantForAccessibility={menu ? 'no-hide-descendants' : 'auto'}>
        {children}
      </View>
      {menu && <SelectionOverlay label={menu.label} content={menu.content} inline={inline} layout={layout} panelRef={panel} headingRef={heading} onClose={() => close()}
        onHeadingHeight={(next) => {
          if (headingHeight.current !== next) { contentHeight.current += next - headingHeight.current; headingHeight.current = next; reposition(); }
        }} onOptionsHeight={(measuredHeight) => {
          const next = measuredHeight + headingHeight.current + 2;
          if (contentHeight.current !== next) { contentHeight.current = next; reposition(); }
        }} />}
    </View>
  </SelectionContext.Provider>;
}

/** Both states render in this absolute surface, outside the editor's layout and scroll container. */
export function SelectionOverlay({ label, content, inline, layout, panelRef, headingRef, onClose, onHeadingHeight, onOptionsHeight }: {
  label: string; content: ReactNode; inline: InlineRequest | null; layout: ReturnType<typeof selectionMenuLayout>;
  panelRef?: Ref<View>; headingRef?: Ref<View>; onClose: () => void; onHeadingHeight: (height: number) => void; onOptionsHeight: (height: number) => void;
}) {
  const colors = useTheme();
  return <View style={StyleSheet.absoluteFill} role="dialog" aria-label={inline?.title ?? `${label} choices`} aria-modal accessibilityViewIsModal onAccessibilityEscape={onClose}>
    <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={inline ? `Dismiss ${inline.title.toLowerCase()} without saving` : `Close ${label.toLowerCase()} choices`} onPress={onClose} />
    {layout && <View ref={panelRef} style={[styles.menu, { left: layout.left, top: layout.top, width: layout.width, height: layout.height,
      backgroundColor: colors[SurfaceColors.overlay], borderColor: colors.borderStrong }]}>
      <View ref={headingRef} accessible tabIndex={-1} accessibilityRole="header" accessibilityLabel={inline?.title ?? `${label} choices`} style={styles.heading}
        onLayout={(event) => onHeadingHeight(event.nativeEvent.layout.height)}>
        <ThemedText type="cardTitle">{inline?.title ?? label}</ThemedText>
      </View>
      {inline ? inline.content : <ScrollView keyboardShouldPersistTaps="always" style={styles.container} contentContainerStyle={styles.options}
        onContentSizeChange={(_width, height) => onOptionsHeight(height)}>{content}</ScrollView>}
    </View>}
  </View>;
}

/** Stop underlying form gestures while a menu is open; remeasure if scrolling was already in flight. */
export function FormScrollView({ onScroll, scrollEnabled = true, ref, ...props }: ScrollViewProps & { ref?: Ref<ScrollView> }) {
  const selection = useFormSelection();
  return <ScrollView {...props} ref={ref} scrollEnabled={scrollEnabled && !selection.activeId} scrollEventThrottle={16}
    onScroll={(event) => { selection.reposition(); onScroll?.(event); }} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  menu: { position: 'absolute', borderWidth: 1, borderRadius: Radius.overlay, overflow: 'hidden', elevation: 4 },
  heading: { padding: Space.sm, flexShrink: 0 },
  options: { padding: Space.sm, gap: Space.xs },
});
