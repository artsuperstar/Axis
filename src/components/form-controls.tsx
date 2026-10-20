import { useEffect, useId, useRef, useState, type Ref } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { UiButton, UiIcon, UiText, useDesignColors, useInterfaceFontStyle } from './design-system';
import type { UiIconName } from './ui-icon';
import { Shape, TouchTarget } from '@/constants/design-system-v2';
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

export function SelectField<T extends SelectionValue>({ label, value, options, onChange, displayValue, description, action, onOpen, disabled = false, error, ref, appearance, icon }: {
  label: string; value: T; options: readonly SelectionOption<T>[]; onChange: (value: T) => void; displayValue?: string; description?: string;
  action?: SelectionInlineAction; onOpen?: () => void; disabled?: boolean; error?: string | null; ref?: Ref<View>;
  appearance?: 'v2'; icon?: UiIconName;
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
    disabled={disabled} expanded={expanded} error={error} appearance={appearance} icon={icon} onPress={() => {
      if (expanded) { selection.close(); return; }
      if (!trigger.current) return;
      onOpen?.();
      selection.open({ id, label, trigger: trigger.current, appearance, estimatedHeight: 52 + options.length * 56 + (description ? 96 : 0) + (action ? 64 : 0),
        content: <SelectionMenu appearance={appearance} label={label} value={value} options={options} onChange={onChange} description={description} action={action} onInlineAction={selection.beginInline} onClose={selection.close} /> });
    }} />;
}

/** The dropdown body is shared; category actions and selection side effects stay in the feature. */
export function SelectionMenu<T extends SelectionValue>({ label, value, options, onChange, description, action, onInlineAction, onClose, appearance }: {
  label: string; value: T; options: readonly SelectionOption<T>[]; onChange: (value: T) => void; description?: string;
  action?: SelectionInlineAction; onInlineAction?: (action: SelectionInlineAction) => void; onClose: (restoreFocus?: boolean) => void;
  appearance?: 'v2';
}) {
  const colors = useTheme();
  const design = useDesignColors();
  return <>
    {!!description && (appearance === 'v2' ? <UiText type="secondary" color="textSecondary">{description}</UiText> : <ThemedText type="secondary" themeColor="textSecondary">{description}</ThemedText>)}
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.field}>
      {options.map((option) => <FormChoice appearance={appearance} key={String(option.value)} label={option.label} selected={option.value === value} disabled={option.disabled}
        onPress={() => { onClose(); onChange(option.value); }} />)}
    </View>
    {action && <View style={[styles.menuAction, { borderColor: appearance === 'v2' ? design.border : colors.border }]}>
      <FormButton appearance={appearance} variant="quiet" label={action.label} accessibilityLabel={action.accessibilityLabel} onPress={() => onInlineAction?.(action)} />
    </View>}
  </>;
}

/** A generic name action inside the current overlay; features provide the domain operation and errors. */
export function InlineNameForm({ title, onCancel, onComplete, onSize, onSubmit, formatError, appearance }: InlineActionControls & {
  onSubmit: (name: string, complete: () => void) => void; formatError: (cause: unknown) => string;
  appearance?: 'v2';
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
      <FormField appearance={appearance} ref={input} label="Name *" accessibilityLabel={`${title} name, required`} value={name} autoFocus returnKeyType="done" submitBehavior="submit"
        onChangeText={(value) => { setName(value); setError(null); }} onSubmitEditing={submit}
        onLayout={(event) => { inputBounds.current = event.nativeEvent.layout; keepInputVisible(); }} />
      <FormError appearance={appearance} message={error} />
    </ScrollView>
    <View style={styles.inlineFooter} onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}>
      <View style={styles.inlineButton}><FormButton appearance={appearance} variant="quiet" label="Cancel" accessibilityLabel={`Cancel ${title.toLowerCase()}`} onPress={onCancel} /></View>
      <View style={styles.inlineButton}><FormButton appearance={appearance} variant="primary" label="Create" accessibilityLabel={`Create ${title.toLowerCase().replace(/^new /, '')}`} onPress={submit} disabled={!name.trim()} /></View>
    </View>
  </View>;
}

export function FormButton({ label, onPress, disabled = false, selected = false, accessibilityLabel, accessibilityHint, variant = 'secondary', compactNavigation = false, expanded, align = 'center', ref, appearance: visual, icon, leadingIcon, trailingIcon, showIndicator, feature, tone }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  accessibilityLabel?: string;
  variant?: ButtonVariant;
  /** Opt-in for a single-row navigation strip: unchanged label, compact padding, underline selection. */
  compactNavigation?: boolean;
  expanded?: boolean;
  align?: 'start' | 'center';
  ref?: Ref<View>;
  appearance?: 'v2';
  tone?: 'brand';
  leadingIcon?: UiIconName; trailingIcon?: UiIconName; accessibilityHint?: string;
  icon?: UiIconName;
  showIndicator?: boolean;
  feature?: 'fitness' | 'tasks';
}) {
  const colors = useTheme();
  const compact = variant === 'navigation' && compactNavigation;
  const [focused, setFocused] = useState(false);
  const appearance = buttonAppearance(colors, variant, { disabled, selected, focused });
  if (visual === 'v2') return <UiButton {...{ label, onPress, disabled, selected, accessibilityLabel, accessibilityHint, variant, expanded, align, ref, icon, leadingIcon, trailingIcon, showIndicator, feature, tone }} />;
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, selected, ...(expanded === undefined ? {} : { expanded }) }}
      aria-expanded={expanded}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.button, compact && styles.compactNavigation, buttonAppearance(colors, variant, { disabled, selected, focused, pressed }).style, { alignItems: align === 'start' ? 'flex-start' : 'center' }]}>
      <ThemedText type="button" numberOfLines={compact ? 1 : undefined} style={{ color: appearance.textColor }}>{label}{variant === 'navigation' && selected && !compact ? ' ✓' : ''}</ThemedText>
    </Pressable>
  );
}

export function FormSelect({ label, value, onPress, disabled = false, expanded = false, accessibilityHint, error, ref, appearance: visual, icon }: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
  expanded?: boolean;
  accessibilityHint?: string;
  ref?: Ref<View>;
  error?: string | null;
  appearance?: 'v2'; icon?: UiIconName;
}) {
  const colors = useTheme();
  const design = useDesignColors();
  const [focused, setFocused] = useState(false);
  const appearance = visual === 'v2' ? { backgroundColor: disabled ? design.inset : design.surface,
    color: disabled ? design.textMuted : design.textPrimary, borderColor: error ? design.danger : focused || expanded ? design.brand : design.border,
    borderRadius: Shape.control } : fieldAppearance(colors, { disabled, focused, expanded, invalid: !!error });
  return (
    <View style={styles.field}>
      {visual === 'v2' ? <UiText type="fieldLabel">{label}</UiText> : <ThemedText type="button">{label}</ThemedText>}
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
        {visual === 'v2' ? <>
          {icon && <UiIcon name={icon} color={appearance.color} />}
          <UiText type="body" style={[styles.value, { color: appearance.color }]}>{value}</UiText>
          <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}><UiIcon name="chevron" color={appearance.color} size={18} /></View>
        </> : <>
          <ThemedText type="body" style={[styles.value, { color: appearance.color }]}>{value}</ThemedText>
          <ThemedText type="body" accessible={false} importantForAccessibility="no" style={[styles.check, { color: appearance.color }]}>{expanded ? '▴' : '▾'}</ThemedText>
        </>}
      </Pressable>
      <FormError appearance={visual} message={error ?? null} />
    </View>
  );
}

export function FormChoice({ label, selected, onPress, disabled = false, appearance }: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  appearance?: 'v2';
}) {
  const colors = useTheme();
  const design = useDesignColors();
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
        backgroundColor: appearance === 'v2' ? disabled ? design.inset : selected || focused ? design.selected : 'transparent'
          : disabled ? colors.surfaceMuted : selected || focused ? colors.accentMuted : 'transparent',
        opacity: pressed && !disabled ? 0.85 : 1,
      }]}>
      {appearance === 'v2' ? <>
        <UiText type="body" color={disabled ? 'textMuted' : 'textPrimary'} style={styles.value}>{label}</UiText>
        <View style={styles.check}>{selected && <UiIcon name="check" color={design.brand} />}</View>
      </> : <>
        <ThemedText type="body" style={[styles.value, { color: disabled ? colors.textMuted : colors.textPrimary }]}>{label}</ThemedText>
        <ThemedText type="body" accessible={false} importantForAccessibility="no" style={[styles.check, { color: colors.accent }]}>{selected ? '✓' : ''}</ThemedText>
      </>}
    </Pressable>
  );
}

export function FormWeekday({ label, checked, onPress, appearance }: { label: string; checked: boolean; onPress: () => void; appearance?: 'v2' }) {
  const colors = useTheme();
  const design = useDesignColors();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }} aria-checked={checked} onPress={onPress}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.button, appearance === 'v2' ? { flexDirection: 'row', gap: 4, minHeight: TouchTarget, borderWidth: 1,
        backgroundColor: checked || pressed ? design.selected : design.control, borderRadius: Shape.control,
        borderColor: checked || focused ? design.brand : design.border } : buttonAppearance(colors, 'secondary', { selected: checked, pressed }).style]}>
      {appearance === 'v2' ? <><UiText type="button" color={checked ? 'brand' : 'textPrimary'}>{label.slice(0, 3)}</UiText>
        {checked && <UiIcon name="check" color={design.brand} size={16} />}</>
        : <ThemedText type="button" themeColor={checked ? 'accent' : 'textPrimary'}>{label.slice(0, 3)}{checked ? ' ✓' : ''}</ThemedText>}
    </Pressable>
  );
}

export function FormField({ label, style, ref, helperText, editable = true, readOnly: readOnlyProp = false, disabled = false, multiline = false, error, accessibilityState, onFocus, onBlur, appearance, ...props }: TextInputProps & {
  label: string; helperText?: string; disabled?: boolean; error?: string | null; ref?: Ref<TextInput>; appearance?: 'v2';
}) {
  const colors = useTheme();
  const design = useDesignColors();
  const font = useInterfaceFontStyle();
  const input = useRef<TextInput>(null);
  const focus = useFormFocus();
  const [focused, setFocused] = useState(false);
  const unavailable = disabled || !!accessibilityState?.disabled;
  const readOnly = (!editable || readOnlyProp) && !unavailable;
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabel}>
        {appearance === 'v2' ? <UiText type="fieldLabel">{label}</UiText> : <ThemedText type="button">{label}</ThemedText>}
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
        placeholderTextColor={appearance === 'v2' ? design.textMuted : colors.textSecondary}
        selectionColor={appearance === 'v2' ? design.brand : colors.accent}
        multiline={multiline}
        style={[styles.input, multiline ? styles.multilineInput : styles.singleLineInput,
          appearance === 'v2' ? { ...font, fontSize: 16, borderRadius: Shape.control, outlineColor: design.brand, color: unavailable ? design.textMuted : design.textPrimary,
            backgroundColor: readOnly || unavailable ? design.inset : design.surface, borderColor: error ? design.danger : focused ? design.brand : design.border }
            : fieldAppearance(colors, { readOnly, disabled: unavailable, focused, invalid: !!error }), style]}
        onFocus={(event) => { setFocused(true); focus?.focus(input.current); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); focus?.blur(input.current); onBlur?.(event); }}
        {...props}
      />
      {!!helperText && (appearance === 'v2' ? <UiText type="secondary" color="textSecondary">{helperText}</UiText>
        : <ThemedText type="secondary" themeColor="textSecondary">{helperText}</ThemedText>)}
      <FormError appearance={appearance} message={error ?? null} />
    </View>
  );
}

export function FormError({ message, appearance }: { message: string | null; appearance?: 'v2' }) {
  if (!message) return null;
  if (appearance === 'v2') return <UiText type="secondary" color="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">{message}</UiText>;
  return <StatusText tone="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">{message}</StatusText>;
}

const { lineHeight: inputLineHeight, ...inputTypography } = Typography.input;
const styles = StyleSheet.create({
  segments: { flexDirection: 'row', borderWidth: 1, borderRadius: Radius.control, overflow: 'hidden' },
  segment: { flex: 1, minWidth: 0, minHeight: ControlSize.field, alignItems: 'center', justifyContent: 'center', padding: Space.sm },
  segmentText: { textAlign: 'center', flexShrink: 1 },
  menuAction: { borderTopWidth: 1, paddingTop: Space.sm },
  button: { minHeight: ControlSize.touch, minWidth: ControlSize.touch, justifyContent: 'center', alignItems: 'center', borderRadius: Radius.control, paddingHorizontal: Space.lg, paddingVertical: Space.sm },
  compactNavigation: { paddingHorizontal: Space.micro },
  field: { gap: Space.sm },
  fieldLabel: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.sm },
  select: { minHeight: ControlSize.field, flexDirection: 'row', alignItems: 'center', gap: Space.sm, borderWidth: 1, borderRadius: Radius.control, paddingHorizontal: Space.lg, paddingVertical: Space.sm },
  option: { minHeight: ControlSize.field, flexDirection: 'row', alignItems: 'center', gap: Space.sm, borderRadius: Radius.small, paddingHorizontal: Space.md, paddingVertical: Space.sm },
  value: { flex: 1, flexShrink: 1 },
  check: { minWidth: ControlSize.indicator, textAlign: 'center' },
  input: { minHeight: ControlSize.field, borderWidth: 1, borderRadius: Radius.control, paddingHorizontal: Space.lg, ...inputTypography },
  // iOS insets UIKit's already-positioned text/editing rect with native input padding.
  // Let single-line native centering own vertical placement in every focus/value state.
  singleLineInput: { paddingVertical: 0, textAlignVertical: 'center' },
  multilineInput: { paddingVertical: Space.sm, lineHeight: inputLineHeight, textAlignVertical: 'top' },
  inlineForm: { flex: 1, minHeight: 0 },
  inlineBody: { flex: 1 },
  inlineContent: { padding: Space.sm, gap: Space.sm },
  inlineFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, padding: Space.sm, flexShrink: 0 },
  inlineButton: { flex: 1, minWidth: 80 },
});
