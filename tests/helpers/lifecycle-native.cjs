const React = require('react');
const { randomUUID } = require('node:crypto');

// Mock only native/selection boundaries. Screens, hooks, sheets, editor state and database writes are real.
function host(kind) {
  return React.forwardRef(function NativeBoundary(props, ref) {
    return React.createElement('axis-node', { ref: (node) => {
      if (node) { node.kind = kind; node.props = props; }
      if (typeof ref === 'function') ref(node); else if (ref) ref.current = node;
    } }, props.children ?? props.label);
  });
}
const View = host('View');
const ModalHost = host('Modal');
const Modal = (props) => props.visible === false ? null : React.createElement(ModalHost, props);
const ListHost = host('FlatList');
function FlatList(props) {
  return React.createElement(ListHost, props, props.ListHeaderComponent,
    props.data.length ? props.data.map((item, index) => React.createElement(React.Fragment, { key: props.keyExtractor(item) }, props.renderItem({ item, index }))) : props.ListEmptyComponent,
    props.ListFooterComponent);
}
const SectionHost = host('SectionList');
const SectionList = React.forwardRef(function SectionList(props, ref) {
  React.useImperativeHandle(ref, () => ({
    scrollToLocation(value) {
      fixture.scrollLocations.push(value);
      if (fixture.scrollFailures > 0) {
        fixture.scrollFailures--;
        props.onScrollToIndexFailed?.({ index: 400, averageItemLength: 75, highestMeasuredFrameIndex: 10 });
      }
    },
    getScrollResponder: () => ({ scrollTo: (value) => fixture.scrollOffsets.push(value) }),
    recordInteraction() {},
  }), [props]);
  let cellIndex = 0;
  function cell(item, key, children) {
    const index = cellIndex++;
    return props.CellRendererComponent ? React.createElement(props.CellRendererComponent,
      { key, cellKey: key, index, item, onLayout: (event) => fixture.cellLayouts.push(event), onFocusCapture() {} }, children)
      : React.createElement(React.Fragment, { key }, children);
  }
  return React.createElement(SectionHost, props, props.ListHeaderComponent,
    props.sections.length ? props.sections.map((section) => React.createElement(React.Fragment, { key: section.title },
      cell(section, `${section.title}:header`, props.renderSectionHeader({ section })),
      section.data.map((item, index) => cell(item, `${section.title}:${props.keyExtractor(item)}`, props.renderItem({ item, index, section }))),
      cell(section, `${section.title}:footer`, props.renderSectionFooter?.({ section })))) : props.ListEmptyComponent,
    props.ListFooterComponent);
});
const appStateListeners = new Set();
const focusEffects = new Set();
const backListeners = new Set();
const removalListeners = new Set();
const reducedMotionListeners = new Set();
const selection = { reposition() {}, dismiss() { return false; } };
const FormSelectionHost = React.forwardRef(function SelectionBoundary(props, ref) {
  React.useImperativeHandle(ref, () => selection, []);
  return React.createElement(View, props);
});
const FormScrollView = host('ScrollView');
const FormErrorHost = host('FormError');
const controls = {
  FormButton: host('FormButton'), FormField: host('FormField'), FormSelect: host('FormSelect'),
  SelectField: host('SelectField'), SegmentedControl: host('SegmentedControl'), InlineNameForm: host('InlineNameForm'), FormWeekday: host('FormWeekday'),
  FormError: (props) => props.message ? React.createElement(FormErrorHost, props, props.message) : null,
  FormSelectionHost, FormScrollView,
};
const fixture = {
  scrollLocations: [], scrollOffsets: [], scrollFailures: 0,
  layoutAnimations: [],
  cellLayouts: [],
  db: null, failures: new Set(), accesses: {}, reads: [], alerts: [], navigation: [], pickers: [],
  wrap(kind, access) {
    const wrapped = new Proxy(access, { get(target, name) {
      const value = target[name];
      if (typeof value !== 'function' || !(String(name).startsWith('read') || kind === 'journal' && /^(get|list|has)/.test(String(name)))) return value;
      return (...args) => {
        fixture.reads.push(`${kind}.${String(name)}`);
        if (fixture.failures.has(`${kind}.${String(name)}`)) throw new Error('Injected refresh failure');
        return value(...args);
      };
    } });
    fixture.accesses[kind] = wrapped;
    return wrapped;
  },
};
module.exports = {
  fixture, controls,
  navigation: { usePreventRemove(enabled, callback) {
    React.useEffect(() => {
      if (!enabled) return;
      removalListeners.add(callback); return () => removalListeners.delete(callback);
    }, [enabled, callback]);
  } },
  selection: { FormSelectionHost, FormScrollView, useFormSelection: () => selection, focusFormControl: (target) => target?.focus() },
  autocomplete: { AutocompleteField: host('AutocompleteField') },
  themedText: { ThemedText: host('ThemedText') },
  safeArea: { SafeAreaView: host('SafeAreaView'), SafeAreaProvider: ({ children }) => children, SafeAreaInsetsContext: React.createContext({ top: 0, left: 0, right: 0, bottom: 0 }), useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }) },
  screenSafeArea: { SafeAreaView: host('SafeAreaView') },
  crypto: { randomUUID }, database: { useDatabase: () => fixture.db },
  picker: { __esModule: true, default: host('DateTimePicker'), DateTimePickerAndroid: { open: (options) => fixture.pickers.push(options) } },
  router: { router: { push: (target) => fixture.navigation.push({ method: 'push', target }), navigate: (target) => fixture.navigation.push({ method: 'navigate', target }),
    canGoBack: () => true, back: () => fixture.navigation.push({ method: 'back' }), replace: (target) => fixture.navigation.push({ method: 'replace', target }) }, useFocusEffect(callback) {
    React.useEffect(() => {
      const effect = { callback, cleanup: callback() }; focusEffects.add(effect);
      return () => { effect.cleanup?.(); focusEffects.delete(effect); };
    }, [callback]);
  }, useLocalSearchParams: () => fixture.routeParams ?? {}, useNavigation: () => ({ dispatch: (action) => fixture.navigation.push({ method: 'dispatch', target: action }) }) },
  native: {
    LayoutAnimation: { configureNext: (config) => fixture.layoutAnimations.push(config) },
    AccessibilityInfo: { sendAccessibilityEvent: (target) => target?.focus(), isReduceMotionEnabled: () => Promise.resolve(false),
      addEventListener: (_event, callback) => { reducedMotionListeners.add(callback); return { remove: () => reducedMotionListeners.delete(callback) }; } },
    BackHandler: { addEventListener: (_event, callback) => { backListeners.add(callback); return { remove: () => backListeners.delete(callback) }; } },
    View, Text: host('Text'), Pressable: host('Pressable'), ScrollView: FormScrollView, KeyboardAvoidingView: host('KeyboardAvoidingView'), Modal, FlatList, SectionList,
    TextInput: host('TextInput'), ActivityIndicator: host('ActivityIndicator'), Image: host('Image'),
    StyleSheet: { create: (styles) => styles, absoluteFill: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 } }, Platform: { OS: 'web', select: (options) => options.web ?? options.default },
    Keyboard: { metrics: () => null, addListener: () => ({ remove() {} }), dismiss() {} },
    useColorScheme: () => 'light', useWindowDimensions: () => ({ height: 800, width: 400, scale: 1, fontScale: 1 }),
    Alert: { alert: (title, message, buttons) => fixture.alerts.push({ title, message, buttons }) }, AppState: { addEventListener(_event, callback) {
      appStateListeners.add(callback); return { remove: () => appStateListeners.delete(callback) };
    } },
  },
  resume() { for (const callback of [...appStateListeners]) callback('active'); },
  refocus() { for (const effect of [...focusEffects]) { effect.cleanup?.(); effect.cleanup = effect.callback(); } },
  blur() { for (const effect of [...focusEffects]) { effect.cleanup?.(); effect.cleanup = undefined; } },
  back() { for (const callback of [...backListeners].reverse()) if (callback()) return true; return false; },
  removeRoute(action) { for (const callback of [...removalListeners]) callback({ data: { action } }); },
  reduceMotion(value) { for (const callback of [...reducedMotionListeners]) callback(value); },
  reducedMotionListenerCount: () => reducedMotionListeners.size,
};
