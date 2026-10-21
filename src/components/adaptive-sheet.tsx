import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type KeyboardEvent, type ScrollViewProps, type StyleProp, type TextInput, type ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Space, SurfaceColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { adaptiveSheetLayout, focusedFieldScroll, sheetViewportLayout } from './adaptive-sheet-layout';
import { BackButton } from './back-button';
import { FormButton } from './form-controls';
import { FormFocusContext } from './form-focus';
import { FormScrollView, FormSelectionHost, useFormSelection, type FormSelectionHandle } from './form-selection-host';
import { ThemedText } from './themed-text';
import { SheetRefreshNotice } from './sheet-refresh-notice';
import { useDesignColors } from './design-system';

const SheetBounds = createContext<{ height: number; bottomInset: number; leftInset: number; rightInset: number } | null>(null);
const SheetScrollContext = createContext<(ScrollViewProps & { ref: Ref<ScrollView> }) | null>(null);
const ModalBackContext = createContext<((handler: () => void) => () => void) | null>(null);

/** Opt-in nested surfaces consume modal Back/outside/escape before the parent draft closes. */
export function useModalBackHandler(handler: (() => void) | null) {
  const register = useContext(ModalBackContext);
  useEffect(() => handler ? register?.(handler) : undefined, [handler, register]);
}

/** A custom virtualized body shares the sheet's scroll measurements and focused-field reveal. */
export function useSheetScrollProps() {
  const props = useContext(SheetScrollContext);
  if (!props) throw new Error('A sheet scroll body must be inside AdaptiveSheet.');
  return props;
}

/** The native modal supplies stacking; the full safe-area host lets menus extend beyond short sheets. */
export function AdaptiveModal({ children, onDismiss, visible = true, onClosed }: {
  children: ReactNode; onDismiss: () => void; visible?: boolean; onClosed?: () => void;
}) {
  const colors = useTheme();
  const menu = useRef<FormSelectionHandle>(null);
  const nestedBack = useRef<(() => void) | null>(null);
  const registerBack = useCallback((handler: () => void) => {
    const previous = nestedBack.current; nestedBack.current = handler;
    return () => { if (nestedBack.current === handler) nestedBack.current = previous; };
  }, []);
  function requestClose() { if (!menu.current?.dismiss()) (nestedBack.current ?? onDismiss)(); }
  return <Modal visible={visible} transparent presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={requestClose} onDismiss={onClosed}>
    <SafeAreaProvider>
      <View style={styles.fill}>
        <FormSelectionHost ref={menu}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} accessibilityRole="button" accessibilityLabel="Close sheet" onPress={requestClose} />
          <ModalBackContext.Provider value={registerBack}><SheetViewport onDismiss={requestClose}>{children}</SheetViewport></ModalBackContext.Provider>
        </FormSelectionHost>
      </View>
    </SafeAreaProvider>
  </Modal>;
}

function SheetViewport({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const viewport = useRef<View>(null);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(() => Keyboard.metrics?.()?.screenY ?? null);
  const revision = useRef(0);
  const [windowFrame, setWindowFrame] = useState({ height, top: 0 });
  const available = sheetViewportLayout(windowFrame.height, windowFrame.top, keyboardTop, insets.top, insets.bottom, Space.sm);
  const invalidate = useCallback(() => { revision.current++; }, []);
  const measure = useCallback(() => {
    const current = ++revision.current;
    viewport.current?.measureInWindow((_x, top, _width, measuredHeight) => {
      if (revision.current !== current || measuredHeight <= 0) return;
      setWindowFrame((currentFrame) => currentFrame.height === measuredHeight && currentFrame.top === top ? currentFrame : { height: measuredHeight, top });
    });
  }, []);
  useEffect(() => {
    const update = (event: KeyboardEvent) => { setKeyboardTop(event.endCoordinates.height > 0 ? event.endCoordinates.screenY : null); measure(); };
    const clear = () => { setKeyboardTop(null); measure(); };
    const listeners = [Keyboard.addListener('keyboardDidShow', update), Keyboard.addListener('keyboardDidHide', clear)];
    if (Platform.OS === 'ios') listeners.push(Keyboard.addListener('keyboardWillChangeFrame', update), Keyboard.addListener('keyboardDidChangeFrame', update), Keyboard.addListener('keyboardWillHide', clear));
    measure();
    return () => { invalidate(); listeners.forEach((listener) => listener.remove()); };
  }, [measure, invalidate, height, width]);
  return <View ref={viewport} collapsable={false} pointerEvents="box-none" style={styles.fill} onLayout={measure}>
    <SheetBounds.Provider value={{ height: available.height, bottomInset: available.bottomInset, leftInset: insets.left, rightInset: insets.right }}>
      <View pointerEvents="box-none" style={[styles.placement, { height: available.height, top: available.top }]}
        accessibilityViewIsModal onAccessibilityEscape={onDismiss}>
        {children}
      </View>
    </SheetBounds.Provider>
  </View>;
}

/** Measure the fixed header and unconstrained scroll content separately, never the clipped body. */
export function AdaptiveSheet({ title, header, children, onDismiss, action, onConfirm, contentContainerStyle, appearance, scrollBody, fillHeight = false }: {
  title?: string; header?: ReactNode; children?: ReactNode; onDismiss?: () => void; action?: string; onConfirm?: () => void; contentContainerStyle?: StyleProp<ViewStyle>; appearance?: 'v2';
  /** Virtualized bodies reuse the same focus/keyboard/selection host without nesting scroll views. */
  scrollBody?: ReactNode; fillHeight?: boolean;
}) {
  const colors = useTheme();
  const design = useDesignColors();
  const { height } = useWindowDimensions();
  const bounds = useContext(SheetBounds);
  const maximum = bounds?.height ?? height;
  const selection = useFormSelection();
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const body = useRef<ScrollView>(null);
  const attachBody = useCallback((scroll: ScrollView | null) => { body.current = scroll; }, []);
  const bodyViewport = useRef<View>(null);
  const offset = useRef(0);
  const focused = useRef<TextInput | null>(null);
  const frame = useRef<number | null>(null);
  const layout = adaptiveSheetLayout(headerHeight ?? 0, contentHeight ?? maximum, maximum, bounds?.bottomInset);
  const ready = headerHeight !== null && contentHeight !== null;
  const revealFocused = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const input = focused.current;
      const scroll = body.current;
      if (!input || !scroll) return;
      bodyViewport.current?.measureInWindow((_x, bodyTop, _width, bodyHeight) => {
        input.measureInWindow((_inputX, inputTop, _inputWidth, inputHeight) => {
          if (focused.current !== input || body.current !== scroll || !bodyHeight || !inputHeight) return;
          const next = focusedFieldScroll(offset.current, inputTop, inputHeight, bodyTop, bodyHeight, Space.sm);
          if (Math.abs(next - offset.current) > 1) scroll.scrollTo({ y: next, animated: false });
        });
      });
    });
  }, []);
  const focus = useMemo(() => ({ focus: (input: TextInput | null) => { focused.current = input; revealFocused(); },
    blur: (input: TextInput | null) => { if (focused.current === input) focused.current = null; } }), [revealFocused]);
  useEffect(() => { revealFocused(); }, [layout.height, headerHeight, contentHeight, revealFocused]);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); focused.current = null; }, []);
  const scrollProps = { ref: attachBody, style: styles.body, contentContainerStyle: contentContainerStyle ?? styles.content,
    keyboardShouldPersistTaps: 'handled' as const, automaticallyAdjustKeyboardInsets: false, contentInsetAdjustmentBehavior: 'never' as const,
    scrollEnabled: fillHeight || !ready || layout.scroll,
    onContentSizeChange: (_width: number, measuredHeight: number) => setContentHeight(Math.ceil(measuredHeight)),
    onScroll: (event: Parameters<NonNullable<ScrollViewProps['onScroll']>>[0]) => { offset.current = event.nativeEvent.contentOffset.y; } };
  return <View onLayout={selection.reposition} style={[styles.sheet, { backgroundColor: appearance === 'v2' ? design.canvas : colors[SurfaceColors.overlay], borderColor: appearance === 'v2' ? design.border : colors.border, height: fillHeight ? maximum : ready ? layout.height : maximum,
    paddingBottom: layout.paddingBottom, paddingLeft: bounds?.leftInset ?? 0, paddingRight: bounds?.rightInset ?? 0, opacity: ready ? 1 : 0 }]}>
    <View style={[styles.fixedHeader, styles.inner]} onLayout={(event) => setHeaderHeight(Math.ceil(event.nativeEvent.layout.height))}>
      {header ?? <View style={styles.header}>
        {action ? <FormButton variant="quiet" label="Cancel" onPress={onDismiss ?? (() => {})} />
          : <BackButton onPress={onDismiss ?? (() => {})} />}
        <ThemedText type="sheetTitle" accessibilityRole="header" style={[styles.heading, !action && styles.returnHeading]}>{title}</ThemedText>
        {action && onConfirm && <FormButton variant="primary" label={action} onPress={onConfirm} />}
      </View>}
      <SheetRefreshNotice />
    </View>
    <FormFocusContext.Provider value={focus}>
      <View ref={bodyViewport} collapsable={false} style={[styles.body, styles.inner]} onLayout={() => { revealFocused(); selection.reposition(); }}>
        <SheetScrollContext.Provider value={scrollProps}>
          {scrollBody ?? <FormScrollView {...scrollProps}>{children}</FormScrollView>}
        </SheetScrollContext.Provider>
      </View>
    </FormFocusContext.Provider>
  </View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  placement: { position: 'absolute', left: 0, right: 0, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', borderTopLeftRadius: Radius.overlay, borderTopRightRadius: Radius.overlay, overflow: 'hidden', borderTopWidth: 1 },
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  fixedHeader: { flexShrink: 0 },
  body: { flex: 1, minHeight: 0 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm, padding: Space.lg },
  heading: { flex: 1, minWidth: 80, textAlign: 'center' },
  returnHeading: { textAlign: 'left' },
  content: { padding: Space.lg, gap: Space.lg },
});
