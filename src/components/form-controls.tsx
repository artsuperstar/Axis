import { useEffect, useId, useRef, useState, type Ref } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { submitInlineName, type SelectionOption, type SelectionValue } from './form-selection';
import { useFormFocus } from './form-focus';
import { focusFormControl, useFormSelection, type InlineActionControls, type SelectionInlineAction } from './form-selection-host';

export { FormScrollView, FormSelectionHost, focusFormControl, type FormSelectionHandle } from './form-selection-host';

export function SegmentedControl<T extends SelectionValue>({ label, value, options, onChange, disabled = false }: {
  label: string; value: T; options: readonly SelectionOption<T>[]; onChange: (value: T) => void; disabled?: boolean;
}) {
  const colors = useTheme();
  return <View style={styles.field}>
    <ThemedText type="smallBold">{label}</ThemedText>
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segments, { borderColor: colors.textSecondary }]}>
      {options.map((option, index) => {
        const selected = option.value === value;
        const unavailable = disabled || !!option.disabled;
        return <Pressable key={String(option.value)} accessibilityRole="radio" accessibilityLabel={`${label}: ${option.label}`}
          accessibilityState={{ checked: selected, disabled: unavailable }} aria-checked={selected} aria-disabled={unavailable}
          disabled={unavailable} onPress={() => onChange(option.value)}
          style={({ pressed }) => [styles.segment, { borderRightWidth: index < options.length - 1 ? 1 : 0, borderColor: colors.textSecondary,
            backgroundColor: selected ? colors.backgroundSelected : colors.backgroundElement, opacity: unavailable ? 0.45 : pressed ? 0.7 : 1 }]}>
          <ThemedText type="smallBold" style={styles.segmentText}>{option.label}{selected ? ' ✓' : ''}</ThemedText>
        </Pressable>;
      })}
    </View>
  </View>;
}

export function SelectField<T extends SelectionValue>({ label, value, options, onChange, displayValue, description, action, onOpen, disabled = false, ref }: {
  label: string; value: T; options: readonly SelectionOption<T>[]; onChange: (value: T) => void; displayValue?: string; description?: string;
  action?: SelectionInlineAction; onOpen?: () => void; disabled?: boolean; ref?: Ref<View>;
}) {
  const id = useId();
  const trigger = useRef<View>(null);
  const selection = useFormSelection();
  const expanded = selection.activeId === id;
  return <FormSelect ref={(node) => {
    trigger.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }} label={label} value={displayValue ?? options.find((option) => option.value === value)?.label ?? 'Choose an option'}
    disabled={disabled} expanded={expanded} onPress={() => {
      if (expanded) { selection.close(); return; }
      if (!trigger.current) return;
      onOpen?.();
      selection.open({ id, label, trigger: trigger.current, estimatedHeight: 52 + options.length * 56 + (description ? 96 : 0) + (action ? 64 : 0),
        content: <SelectionMenu label={label} value={value} options={options} onChange={onChange} description={description} action={action} onInlineAction={selection.beginInline} onClose={selection.close} /> });
    }} />;
}

/** The dropdown body is shared; category actions and selection side effects stay in the feature. */
export function SelectionMenu<T extends SelectionValue>({ label, value, options, onChange, description, action, onInlineAction, onClose }: {
  label: string; value: T; options: readonly SelectionOption<T>[]; onChange: (value: T) => void; description?: string;
  action?: SelectionInlineAction; onInlineAction?: (action: SelectionInlineAction) => void; onClose: (restoreFocus?: boolean) => void;
}) {
  const colors = useTheme();
  return <>
    {!!description && <ThemedText type="small" themeColor="textSecondary">{description}</ThemedText>}
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.field}>
      {options.map((option) => <FormChoice key={String(option.value)} label={option.label} selected={option.value === value} disabled={option.disabled}
        onPress={() => { onClose(); onChange(option.value); }} />)}
    </View>
    {action && <View style={[styles.menuAction, { borderColor: colors.textSecondary }]}>
      <FormButton label={action.label} accessibilityLabel={action.accessibilityLabel} onPress={() => onInlineAction?.(action)} />
    </View>}
  </>;
}

/** A generic name action inside the current overlay; features provide the domain operation and errors. */
export function InlineNameForm({ title, onCancel, onComplete, onSize, onSubmit, formatError }: InlineActionControls & {
  onSubmit: (name: string, complete: () => void) => void; formatError: (cause: unknown) => string;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [bodyHeight, setBodyHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const input = useRef<TextInput>(null);
  const scroll = useRef<ScrollView>(null);
  const inputBounds = useRef({ y: 0, height: 0 });
  const viewportHeight = useRef(0);
  const submitting = useRef(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => { input.current?.focus(); focusFormControl(input.current); });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => { if (bodyHeight && footerHeight) onSize(bodyHeight + footerHeight); }, [bodyHeight, footerHeight, onSize]);

  function keepInputVisible() {
    const { y, height } = inputBounds.current;
    if (height && viewportHeight.current && y + height > viewportHeight.current) scroll.current?.scrollTo({ y, animated: false });
  }
  function submit() {
    if (submitting.current) return;
    submitting.current = true;
    const message = submitInlineName(name, onSubmit, onComplete, formatError);
    setError(message);
    // Success unmounts this form. Keep the guard until then to reject a second queued submit.
    if (message) submitting.current = false;
  }
  return <View style={styles.inlineForm}>
    <ScrollView ref={scroll} style={styles.inlineBody} contentContainerStyle={styles.inlineContent} keyboardShouldPersistTaps="always"
      onContentSizeChange={(_width, height) => setBodyHeight(height)}
      onLayout={(event) => { viewportHeight.current = event.nativeEvent.layout.height; keepInputVisible(); }}>
      <FormField ref={input} label="Name *" accessibilityLabel={`${title} name, required`} value={name} autoFocus returnKeyType="done" submitBehavior="submit"
        onChangeText={(value) => { setName(value); setError(null); }} onSubmitEditing={submit}
        onLayout={(event) => { inputBounds.current = event.nativeEvent.layout; keepInputVisible(); }} />
      <FormError message={error} />
    </ScrollView>
    <View style={styles.inlineFooter} onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}>
      <View style={styles.inlineButton}><FormButton label="Cancel" accessibilityLabel={`Cancel ${title.toLowerCase()}`} onPress={onCancel} /></View>
      <View style={styles.inlineButton}><FormButton label="Create" accessibilityLabel={`Create ${title.toLowerCase().replace(/^new /, '')}`} onPress={submit} disabled={!name.trim()} /></View>
    </View>
  </View>;
}

export function FormButton({ label, onPress, disabled = false, selected = false, accessibilityLabel }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  accessibilityLabel?: string;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, {
        borderColor: selected ? colors.text : colors.textSecondary,
        backgroundColor: selected ? colors.backgroundSelected : colors.backgroundElement,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      }]}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

export function FormSelect({ label, value, onPress, disabled = false, expanded = false, accessibilityHint, ref }: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  expanded?: boolean;
  accessibilityHint?: string;
  ref?: Ref<View>;
}) {
  const colors = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        ref={ref}
        accessible
        accessibilityRole="combobox"
        accessibilityLabel={label}
        accessibilityValue={{ text: value }}
        accessibilityState={{ disabled, expanded }}
        aria-valuetext={value}
        aria-expanded={expanded}
        aria-disabled={disabled}
        accessibilityHint={accessibilityHint ?? `Choose ${label.toLowerCase()}`}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.select, {
          borderColor: colors.textSecondary,
          backgroundColor: colors.backgroundElement,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        }]}>
        <ThemedText style={styles.value}>{value}</ThemedText>
        <ThemedText accessible={false} importantForAccessibility="no">▾</ThemedText>
      </Pressable>
    </View>
  );
}

export function FormChoice({ label, selected, onPress, disabled = false }: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessible
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      aria-checked={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.select, {
        borderColor: selected ? colors.text : colors.textSecondary,
        backgroundColor: selected ? colors.backgroundSelected : colors.backgroundElement,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      }]}>
      <ThemedText style={styles.value}>{label}</ThemedText>
      <ThemedText accessible={false} importantForAccessibility="no" style={styles.check}>{selected ? '✓' : ''}</ThemedText>
    </Pressable>
  );
}

export function FormWeekday({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }} onPress={onPress}
      style={({ pressed }) => [styles.button, { borderColor: checked ? colors.text : colors.textSecondary,
        backgroundColor: checked ? colors.backgroundSelected : colors.backgroundElement, opacity: pressed ? 0.7 : 1 }]}>
      <ThemedText type="smallBold">{label.slice(0, 3)}{checked ? ' ✓' : ''}</ThemedText>
    </Pressable>
  );
}

export function FormField({ label, style, ref, helperText, editable = true, accessibilityState, onFocus, onBlur, ...props }: TextInputProps & { label: string; helperText?: string; ref?: Ref<TextInput> }) {
  const colors = useTheme();
  const input = useRef<TextInput>(null);
  const focus = useFormFocus();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        ref={(node) => {
          input.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        accessibilityLabel={label}
        editable={editable}
        accessibilityState={{ ...accessibilityState, disabled: !editable || accessibilityState?.disabled }}
        aria-disabled={!editable || accessibilityState?.disabled}
        accessibilityHint={helperText}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.text}
        style={[styles.input, { color: editable ? colors.text : colors.textSecondary, backgroundColor: colors.backgroundElement, borderColor: colors.textSecondary,
          opacity: editable ? 1 : 0.45 }, style]}
        onFocus={(event) => { focus?.focus(input.current); onFocus?.(event); }}
        onBlur={(event) => { focus?.blur(input.current); onBlur?.(event); }}
        {...props}
      />
      {!!helperText && <ThemedText type="small" themeColor="textSecondary">{helperText}</ThemedText>}
    </View>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite">{message}</ThemedText>;
}

const styles = StyleSheet.create({
  segments: { flexDirection: 'row', borderWidth: 1, borderRadius: Spacing.two, overflow: 'hidden' },
  segment: { flex: 1, minWidth: 0, minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: Spacing.two },
  segmentText: { textAlign: 'center', flexShrink: 1 },
  menuAction: { borderTopWidth: 1, paddingTop: Spacing.two },
  button: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  field: { gap: Spacing.two },
  select: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderWidth: 1, borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  value: { flex: 1, flexShrink: 1 },
  check: { minWidth: 24, textAlign: 'center' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 16 },
  inlineForm: { flex: 1, minHeight: 0 },
  inlineBody: { flex: 1 },
  inlineContent: { padding: Spacing.two, gap: Spacing.two },
  inlineFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, padding: Spacing.two, flexShrink: 0 },
  inlineButton: { flex: 1, minWidth: 80 },
});
