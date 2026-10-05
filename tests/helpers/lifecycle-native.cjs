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
    props.data.length ? props.data.map((item, index) => React.createElement(React.Fragment, { key: props.keyExtractor(item) }, props.renderItem({ item, index }))) : props.ListEmptyComponent);
}
const appStateListeners = new Set();
const focusEffects = new Set();
const selection = { reposition() {}, dismiss() { return false; } };
const FormSelectionHost = React.forwardRef(function SelectionBoundary(props, ref) {
  React.useImperativeHandle(ref, () => selection, []);
  return React.createElement(View, props);
});
const FormScrollView = host('ScrollView');
const FormErrorHost = host('FormError');
const controls = {
  FormButton: host('FormButton'), FormField: host('FormField'), FormSelect: host('FormSelect'),
  SelectField: host('SelectField'), SegmentedControl: host('SegmentedControl'), InlineNameForm: host('InlineNameForm'),
  FormError: (props) => props.message ? React.createElement(FormErrorHost, props, props.message) : null,
  FormSelectionHost, FormScrollView,
};
const fixture = {
  db: null, failures: new Set(), accesses: {},
  wrap(kind, access) {
    const wrapped = new Proxy(access, { get(target, name) {
      const value = target[name];
      if (typeof value !== 'function' || !String(name).startsWith('read')) return value;
      return (...args) => {
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
  selection: { FormSelectionHost, FormScrollView, useFormSelection: () => selection },
  autocomplete: { AutocompleteField: host('AutocompleteField') },
  themedText: { ThemedText: host('ThemedText') },
  safeArea: { SafeAreaProvider: ({ children }) => children, useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }) },
  crypto: { randomUUID }, database: { useDatabase: () => fixture.db },
  picker: { __esModule: true, default() { throw new Error('Native picker is outside this lifecycle test.'); }, DateTimePickerAndroid: { open() {} } },
  router: { useFocusEffect(callback) {
    React.useEffect(() => {
      const effect = { callback, cleanup: callback() }; focusEffects.add(effect);
      return () => { effect.cleanup?.(); focusEffects.delete(effect); };
    }, [callback]);
  } },
  native: {
    View, Text: host('Text'), Pressable: host('Pressable'), ScrollView: FormScrollView, Modal, FlatList,
    TextInput: host('TextInput'), ActivityIndicator: host('ActivityIndicator'),
    StyleSheet: { create: (styles) => styles, absoluteFill: {} }, Platform: { OS: 'web', select: (options) => options.web ?? options.default },
    Keyboard: { metrics: () => null, addListener: () => ({ remove() {} }), dismiss() {} },
    useColorScheme: () => 'light', useWindowDimensions: () => ({ height: 800, width: 400, scale: 1, fontScale: 1 }),
    Alert: { alert() {} }, AppState: { addEventListener(_event, callback) {
      appStateListeners.add(callback); return { remove: () => appStateListeners.delete(callback) };
    } },
  },
  resume() { for (const callback of [...appStateListeners]) callback('active'); },
  refocus() { for (const effect of [...focusEffects]) { effect.cleanup?.(); effect.cleanup = effect.callback(); } },
};
