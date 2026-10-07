import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useId, useRef } from 'react';
import { BackHandler, Platform, View } from 'react-native';

import { ControlSize, Space } from '@/constants/theme';

import { FormButton } from './form-controls';
import { FormSelectionHost, useFormSelection } from './form-selection-host';

export { FormSelectionHost as ContextMenuHost };
export type ContextMenuAction = { label: string; accessibilityLabel?: string; variant?: 'quiet' | 'destructive'; onPress: () => void };

/** Action buttons in the same measured overlay as selectors, with no field or selection semantics. */
export function ContextMenu({ label, actions, disabled = false, onOpen }: {
  label: string; actions: readonly ContextMenuAction[]; disabled?: boolean; onOpen?: () => void;
}) {
  const id = useId();
  const trigger = useRef<View>(null);
  const firstAction = useRef<View>(null);
  const { activeId, open, close } = useFormSelection();
  const expanded = activeId === id;
  // A pushed route or tab switch must never leave an overlay on the retained screen.
  useFocusEffect(useCallback(() => () => { close(false); }, [close]));
  useEffect(() => {
    if (!expanded || Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => close());
    return () => subscription.remove();
  }, [expanded, close]);

  return <FormButton ref={trigger} variant="quiet" label="⋯" accessibilityLabel={label} expanded={expanded} disabled={disabled}
    onPress={() => {
      if (expanded) { close(); return; }
      if (!trigger.current) return;
      onOpen?.();
      open({ id, label, trigger: trigger.current, presentation: 'actions', align: 'end', preferredWidth: 240,
        estimatedHeight: actions.length * (ControlSize.touch + Space.xs) + Space.sm * 2 + 2, initialFocus: firstAction,
        content: <>
          {actions.map((action, index) => <FormButton key={action.label} ref={index === 0 ? firstAction : undefined}
            variant={action.variant ?? 'quiet'} align="start" label={action.label} accessibilityLabel={action.accessibilityLabel} onPress={() => {
              close(false);
              // Commit overlay dismissal before presenting a native modal or pushing a route.
              requestAnimationFrame(action.onPress);
            }} />)}
        </> });
    }} />;
}
