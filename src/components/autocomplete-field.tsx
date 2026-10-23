import { useEffect, useId, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type ViewInstance, type TextInputInstance } from 'react-native';

import { Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { FormButton, FormChoice, FormError, FormField, FormSelect } from './form-controls';
import { submitAutocompleteSelection, type SelectionOption, type SelectionValue } from './form-selection';
import { useFormSelection } from './form-selection-host';
import { ThemedText } from './themed-text';
import { UiText, useDesignColors } from './design-system';

export type AutocompleteResults<T extends SelectionValue> = { suggestions: readonly SelectionOption<T>[]; createLabel?: string };
type AutocompleteProps<T extends SelectionValue> = {
  label: string; value: T; displayValue: string; disabled?: boolean; description?: string;
  getResults: (query: string) => AutocompleteResults<T>; onSelect: (value: T) => void;
  onCreate?: (query: string) => T; formatError?: (cause: unknown) => string;
  /** Richer creation can hand off to a feature-owned sheet in the same modal. */
  onRequestCreate?: (query: string) => void;
  appearance?: 'v2';
};

/** Search and persistence are feature callbacks. The field only owns the overlay interaction. */
export function AutocompleteField<T extends SelectionValue>(props: AutocompleteProps<T>) {
  const id = useId();
  const trigger = useRef<ViewInstance>(null);
  const selection = useFormSelection();
  const expanded = selection.activeId === id;
  function open() {
      if (expanded) { selection.close(); return; }
      if (!trigger.current) return;
      selection.open({ id, label: props.label, trigger: trigger.current, appearance: props.appearance, estimatedHeight: 280, content: null, keyboardInput: true });
      selection.beginInline({ label: props.label, title: props.label.replace(/\s*\*$/, ''), render: (controls) =>
        <AutocompletePanel {...props} onClose={controls.onComplete} onSize={controls.onSize} /> });
  }
  return <FormSelect ref={trigger} appearance={props.appearance} label={props.label} value={props.displayValue} expanded={expanded} disabled={props.disabled}
      accessibilityHint={`Search ${props.label.replace(/\s*\*$/, '').toLowerCase()}`} onPress={open} />;
}

export function AutocompletePanel<T extends SelectionValue>({ label, value, getResults, onSelect, onCreate, onRequestCreate, formatError, description, onClose, onSize, appearance }: AutocompleteProps<T> & {
  onClose: () => void; onSize: (height: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const input = useRef<TextInputInstance>(null);
  const creating = useRef(false);
  const topHeight = useRef(0);
  const resultsHeight = useRef(0);
  const results = getResults(query);
  useEffect(() => {
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  function select(next: T) { onSelect(next); onClose(); }
  function create() {
    if ((!onCreate && !onRequestCreate) || !results.createLabel || creating.current) return;
    creating.current = true;
    if (onRequestCreate) { onClose(); onRequestCreate(query); return; }
    if (!onCreate) return;
    const message = submitAutocompleteSelection(query, onCreate, onSelect, onClose, formatError ?? (() => 'Unable to create this option.'));
    if (message) { creating.current = false; setError(message); }
  }
  return <View style={styles.panel}>
    <View style={styles.search} onLayout={(event) => { topHeight.current = event.nativeEvent.layout.height; onSize(topHeight.current + resultsHeight.current); }}>
      <FormField appearance={appearance} ref={input} label={`Search ${label.replace(/\s*\*$/, '').toLowerCase()}`} value={query} autoFocus autoCorrect={false}
        accessibilityRole="combobox" accessibilityState={{ expanded: true }} aria-expanded
        placeholder="Start typing a name" returnKeyType="search" submitBehavior="submit"
        onChangeText={(next) => { setQuery(next); setError(null); }} />
      <FormError appearance={appearance} message={error} />
    </View>
    <ScrollView style={styles.results} keyboardShouldPersistTaps="always" contentContainerStyle={styles.options}
      onContentSizeChange={(_width, height) => { resultsHeight.current = height; onSize(topHeight.current + height); }}>
      {!!description && (appearance ? <UiText type="secondary" color="textSecondary">{description}</UiText> : <ThemedText type="secondary" themeColor="textSecondary">{description}</ThemedText>)}
      {appearance ? <UiText type="metadata" color="textSecondary" accessibilityLiveRegion="polite">
        {query.trim() ? `${results.suggestions.length} match${results.suggestions.length === 1 ? '' : 'es'}` : 'Type to find a match.'}
      </UiText> : <ThemedText type="metadata" themeColor="textSecondary" accessibilityLiveRegion="polite">
        {query.trim() ? `${results.suggestions.length} match${results.suggestions.length === 1 ? '' : 'es'}` : 'Type to find a match.'}
      </ThemedText>}
      <AutocompleteOptions appearance={appearance} value={value} results={results} onSelect={select} onCreate={onCreate || onRequestCreate ? create : undefined} />
    </ScrollView>
  </View>;
}

export function AutocompleteOptions<T extends SelectionValue>({ value, results, onSelect, onCreate, appearance }: {
  value: T; results: AutocompleteResults<T>; onSelect: (value: T) => void; onCreate?: () => void;
  appearance?: 'v2';
}) {
  const colors = useTheme();
  const design = useDesignColors();
  return <>
    {results.suggestions.map((option) => <FormChoice appearance={appearance} key={String(option.value)} label={option.label} selected={option.value === value}
      disabled={option.disabled} onPress={() => onSelect(option.value)} />)}
    {onCreate && !!results.createLabel && <View style={[styles.createAction, { borderColor: appearance ? design.border : colors.border }]}>
      <FormButton appearance={appearance} variant="quiet" label={results.createLabel} onPress={onCreate} />
    </View>}
  </>;
}

const styles = StyleSheet.create({
  panel: { flex: 1, minHeight: 0 },
  search: { padding: Space.sm, gap: Space.sm, flexShrink: 0 },
  results: { flex: 1, minHeight: 0 },
  options: { padding: Space.sm, gap: Space.sm },
  createAction: { borderTopWidth: 1, paddingTop: Space.sm },
});
