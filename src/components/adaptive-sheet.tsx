import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type KeyboardEvent, type StyleProp, type TextInput, type ViewStyle } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { adaptiveSheetLayout, focusedFieldScroll, sheetViewportLayout } from './adaptive-sheet-layout';
import { FormButton } from './form-controls';
import { FormFocusContext } from './form-focus';
import { FormScrollView, FormSelectionHost, useFormSelection, type FormSelectionHandle } from './form-selection-host';
import { ThemedText } from './themed-text';
import { SheetRefreshNotice } from './sheet-refresh-notice';

const SheetBounds = createContext<{ height: number; bottomInset: number; leftInset: number; rightInset: number } | null>(null);

/** The native modal supplies stacking; the full safe-area host lets menus extend beyond short sheets. */
export function AdaptiveModal({ children, onDismiss, visible = true, onClosed }: {
  children: ReactNode; onDismiss: () => void; visible?: boolean; onClosed?: () => void;
}) {
  const menu = useRef<FormSelectionHandle>(null);
  function requestClose() { if (!menu.current?.dismiss()) onDismiss(); }
  return <Modal visible={visible} transparent presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={requestClose} onDismiss={onClosed}>
    <SafeAreaProvider>
      <View style={styles.fill}>
        <FormSelectionHost ref={menu}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close sheet" onPress={requestClose} />
          <SheetViewport onDismiss={requestClose}>{children}</SheetViewport>
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
  const available = sheetViewportLayout(windowFrame.height, windowFrame.top, keyboardTop, insets.top, insets.bottom, Spacing.two);
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
export function AdaptiveSheet({ title, header, children, onDismiss, action, onConfirm, contentContainerStyle }: {
  title?: string; header?: ReactNode; children: ReactNode; onDismiss?: () => void; action?: string; onConfirm?: () => void; contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const colors = useTheme();
  const { height } = useWindowDimensions();
  const bounds = useContext(SheetBounds);
  const maximum = bounds?.height ?? height;
  const selection = useFormSelection();
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const body = useRef<ScrollView>(null);
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
          const next = focusedFieldScroll(offset.current, inputTop, inputHeight, bodyTop, bodyHeight, Spacing.two);
          if (Math.abs(next - offset.current) > 1) scroll.scrollTo({ y: next, animated: false });
        });
      });
    });
  }, []);
  const focus = useMemo(() => ({ focus: (input: TextInput | null) => { focused.current = input; revealFocused(); },
    blur: (input: TextInput | null) => { if (focused.current === input) focused.current = null; } }), [revealFocused]);
  useEffect(() => { revealFocused(); }, [layout.height, headerHeight, contentHeight, revealFocused]);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); focused.current = null; }, []);
  return <View onLayout={selection.reposition} style={[styles.sheet, { backgroundColor: colors.background, height: ready ? layout.height : maximum,
    paddingBottom: layout.paddingBottom, paddingLeft: bounds?.leftInset ?? 0, paddingRight: bounds?.rightInset ?? 0, opacity: ready ? 1 : 0 }]}>
    <View style={[styles.fixedHeader, styles.inner]} onLayout={(event) => setHeaderHeight(Math.ceil(event.nativeEvent.layout.height))}>
      {header ?? <View style={styles.header}>
        <FormButton label={action ? 'Cancel' : 'Done'} onPress={onDismiss ?? (() => {})} />
        <ThemedText type="smallBold" accessibilityRole="header" style={styles.heading}>{title}</ThemedText>
        {action && onConfirm && <FormButton label={action} onPress={onConfirm} />}
      </View>}
      <SheetRefreshNotice />
    </View>
    <FormFocusContext.Provider value={focus}>
      <View ref={bodyViewport} collapsable={false} style={[styles.body, styles.inner]} onLayout={() => { revealFocused(); selection.reposition(); }}>
        <FormScrollView ref={body} style={styles.body} contentContainerStyle={contentContainerStyle ?? styles.content}
          keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={false} contentInsetAdjustmentBehavior="never"
          scrollEnabled={!ready || layout.scroll}
          onContentSizeChange={(_width, measuredHeight) => setContentHeight(Math.ceil(measuredHeight))}
          onScroll={(event) => { offset.current = event.nativeEvent.contentOffset.y; }}>
          {children}
        </FormScrollView>
      </View>
    </FormFocusContext.Provider>
  </View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  placement: { position: 'absolute', left: 0, right: 0, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', borderTopLeftRadius: Spacing.two, borderTopRightRadius: Spacing.two, overflow: 'hidden' },
  inner: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  fixedHeader: { flexShrink: 0 },
  body: { flex: 1, minHeight: 0 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two, padding: Spacing.three },
  heading: { flex: 1, minWidth: 80, textAlign: 'center' },
  content: { padding: Spacing.three, gap: Spacing.three },
});
