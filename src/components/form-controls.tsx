import { useEffect, useId, useRef, useState, type Ref } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ControlSize, Radius, Space, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { submitInlineName, type SelectionOption, type SelectionValue } from './form-selection';
import { useFormFocus } from './form-focus';
import { buttonAppearance, fieldAppearance, type ButtonVariant } from './control-appearance';
import { StatusText } from './status-text';
import { focusFormControl, useFormSelection, type InlineActionControls, type SelectionInlineAction } from './form-selection-host';

export { FormScrollView, FormSelectionHost, focusFormControl, type FormSelectionHandle } from './form-selection-host';

export function SegmentedControl<T extends SelectionValue>({ label, value, options, onChange, disabled = false }: {
  label: string; value: T; options: readonly SelectionOption<T>[]; onChange: (value: T) => void; disabled?: boolean;
}) {
  const colors = useTheme();
  const [focused, setFocused] = useState<number | null>(null);
  return <View style={styles.field}>
    <ThemedText type="button">{label}</ThemedText>
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segments, { borderColor: colors.border }]}>
      {options.map((option, index) => {
        const selected = option.value === value;
        const unavailable = disabled || !!option.disabled;
        return <Pressable key={String(option.value)} accessibilityRole="radio" accessibilityLabel={`${label}: ${option.label}`}
          accessibilityState={{ checked: selected, disabled: unavailable }} aria-checked={selected} aria-disabled={unavailable}
          disabled={unavailable} onPress={() => onChange(option.value)} onFocus={() => setFocused(index)} onBlur={() => setFocused(null)}
          style={({ pressed }) => [styles.segment, { borderRightWidth: index === options.length - 1 ? 0 : 1, borderColor: colors.border,
            backgroundColor: unavailable ? colors.surfaceMuted : selected || focused === index ? colors.accentMuted : colors.surface,
            borderBottomColor: focused === index ? colors.accent : 'transparent', borderBottomWidth: 2, opacity: pressed && !unavailable ? 0.85 : 1 }]}>
          <ThemedText type="button" style={[styles.segmentText, { color: unavailable ? colors.textMuted : selected ? colors.accent : colors.textPrimary }]}>
            {option.label}{selected ? ' ✓' : ''}
          </ThemedText>
        </Pressable>;
      })}
    </View>
  </View>;
}

export function SelectField<T extends SelectionValue>({ label, value, options, onChange, displayValue, description, action, onOpen, disabled = false, error, ref }: {
  label: string; value: T; options: readonly SelectionOption<T>[]; onChange: (value: T) => void; displayValue?: string; description?: string;
  action?: SelectionInlineAction; onOpen?: () => void; disabled?: boolean; error?: string | null; ref?: Ref<View>;
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
    disabled={disabled} expanded={expanded} error={error} onPress={() => {
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
    {!!description && <ThemedText type="secondary" themeColor="textSecondary">{description}</ThemedText>}
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.field}>
      {options.map((option) => <FormChoice key={String(option.value)} label={option.label} selected={option.value === value} disabled={option.disabled}
        onPress={() => { onClose(); onChange(option.value); }} />)}
    </View>
    {action && <View style={[styles.menuAction, { borderColor: colors.border }]}>
      <FormButton variant="quiet" label={action.label} accessibilityLabel={action.accessibilityLabel} onPress={() => onInlineAction?.(action)} />
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
      <View style={styles.inlineButton}><FormButton variant="quiet" label="Cancel" accessibilityLabel={`Cancel ${title.toLowerCase()}`} onPress={onCancel} /></View>
      <View style={styles.inlineButton}><FormButton variant="primary" label="Create" accessibilityLabel={`Create ${title.toLowerCase().replace(/^new /, '')}`} onPress={submit} disabled={!name.trim()} /></View>
    </View>
  </View>;
}

export function FormButton({ label, onPress, disabled = false, selected = false, accessibilityLabel, variant = 'secondary' }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  accessibilityLabel?: string;
  variant?: ButtonVariant;
}) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);
  const appearance = buttonAppearance(colors, variant, { disabled, selected, focused });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.button, buttonAppearance(colors, variant, { disabled, selected, focused, pressed }).style]}>
      <ThemedText type="button" style={{ color: appearance.textColor }}>{label}{variant === 'navigation' && selected ? ' ✓' : ''}</ThemedText>
    </Pressable>
  );
}

export function FormSelect({ label, value, onPress, disabled = false, expanded = false, accessibilityHint, error, ref }: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  expanded?: boolean;
  accessibilityHint?: string;
  ref?: Ref<View>;
  error?: string | null;
}) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);
  const appearance = fieldAppearance(colors, { disabled, focused, expanded, invalid: !!error });
  return (
    <View style={styles.field}>
      <ThemedText type="button">{label}</ThemedText>
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
        aria-invalid={!!error}
        accessibilityHint={[accessibilityHint ?? `Choose ${label.toLowerCase()}`, error].filter(Boolean).join('. ')}
        disabled={disabled}
        onPress={onPress}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={({ pressed }) => [styles.select, appearance, { opacity: pressed && !disabled ? 0.85 : 1 }]}>
        <ThemedText type="body" style={[styles.value, { color: appearance.color }]}>{value}</ThemedText>
        <ThemedText type="body" accessible={false} importantForAccessibility="no" style={[styles.check, { color: appearance.color }]}>{expanded ? '▴' : '▾'}</ThemedText>
      </Pressable>
      <FormError message={error ?? null} />
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
  const [focused, setFocused] = useState(false);
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
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.option, {
        backgroundColor: disabled ? colors.surfaceMuted : selected || focused ? colors.accentMuted : 'transparent',
        opacity: pressed && !disabled ? 0.85 : 1,
      }]}>
      <ThemedText type="body" style={[styles.value, { color: disabled ? colors.textMuted : colors.textPrimary }]}>{label}</ThemedText>
      <ThemedText type="body" accessible={false} importantForAccessibility="no" style={[styles.check, { color: colors.accent }]}>{selected ? '✓' : ''}</ThemedText>
    </Pressable>
  );
}

export function FormWeekday({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }} onPress={onPress}
      style={({ pressed }) => [styles.button, buttonAppearance(colors, 'secondary', { selected: checked, pressed }).style]}>
      <ThemedText type="button" themeColor={checked ? 'accent' : 'textPrimary'}>{label.slice(0, 3)}{checked ? ' ✓' : ''}</ThemedText>
    </Pressable>
  );
}

export function FormField({ label, style, ref, helperText, editable = true, readOnly: readOnlyProp = false, disabled = false, error, accessibilityState, onFocus, onBlur, ...props }: TextInputProps & {
  label: string; helperText?: string; disabled?: boolean; error?: string | null; ref?: Ref<TextInput>;
}) {
  const colors = useTheme();
  const input = useRef<TextInput>(null);
  const focus = useFormFocus();
  const [focused, setFocused] = useState(false);
  const unavailable = disabled || !!accessibilityState?.disabled;
  const readOnly = (!editable || readOnlyProp) && !unavailable;
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabel}>
        <ThemedText type="button">{label}</ThemedText>
        {readOnly && <ThemedText type="metadata" themeColor="textSecondary">Read only</ThemedText>}
      </View>
      <TextInput
        ref={(node) => {
          input.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        accessibilityLabel={label}
        editable={editable && !readOnlyProp && !unavailable}
        accessibilityState={{ ...accessibilityState, disabled: unavailable }}
        aria-disabled={unavailable}
        aria-invalid={!!error}
        accessibilityHint={[readOnly ? 'Read only' : null, helperText, error].filter(Boolean).join('. ') || undefined}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.accent}
        style={[styles.input, fieldAppearance(colors, { readOnly, disabled: unavailable, focused, invalid: !!error }), style]}
        onFocus={(event) => { setFocused(true); focus?.focus(input.current); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); focus?.blur(input.current); onBlur?.(event); }}
        {...props}
      />
      {!!helperText && <ThemedText type="secondary" themeColor="textSecondary">{helperText}</ThemedText>}
      <FormError message={error ?? null} />
    </View>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <StatusText tone="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">{message}</StatusText>;
}

const styles = StyleSheet.create({
  segments: { flexDirection: 'row', borderWidth: 1, borderRadius: Radius.control, overflow: 'hidden' },
  segment: { flex: 1, minWidth: 0, minHeight: ControlSize.field, alignItems: 'center', justifyContent: 'center', padding: Space.sm },
  segmentText: { textAlign: 'center', flexShrink: 1 },
  menuAction: { borderTopWidth: 1, paddingTop: Space.sm },
  button: { minHeight: ControlSize.touch, minWidth: ControlSize.touch, justifyContent: 'center', alignItems: 'center', borderRadius: Radius.control, paddingHorizontal: Space.lg, paddingVertical: Space.sm },
  field: { gap: Space.sm },
  fieldLabel: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm },
  select: { minHeight: ControlSize.field, flexDirection: 'row', alignItems: 'center', gap: Space.sm, borderWidth: 1, borderRadius: Radius.control, paddingHorizontal: Space.lg, paddingVertical: Space.sm },
  option: { minHeight: ControlSize.field, flexDirection: 'row', alignItems: 'center', gap: Space.sm, borderRadius: Radius.small, paddingHorizontal: Space.md, paddingVertical: Space.sm },
  value: { flex: 1, flexShrink: 1 },
  check: { minWidth: ControlSize.indicator, textAlign: 'center' },
  input: { minHeight: ControlSize.field, borderWidth: 1, borderRadius: Radius.control, paddingHorizontal: Space.lg, paddingVertical: Space.sm, ...Typography.input },
  inlineForm: { flex: 1, minHeight: 0 },
  inlineBody: { flex: 1 },
  inlineContent: { padding: Space.sm, gap: Space.sm },
  inlineFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, padding: Space.sm, flexShrink: 0 },
  inlineButton: { flex: 1, minWidth: 80 },
});
