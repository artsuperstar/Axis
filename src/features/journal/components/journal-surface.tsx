import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';

import { GroupSurface, UiIcon, UiPressable, UiText, useDesignColors } from '@/components/design-system';
import type { UiIconName } from '@/components/ui-icon';
import { DesignSpace as Space, Shape, TouchTarget } from '@/constants/design-system-v2';
import { useTheme } from '@/hooks/use-theme';
import { BackButton } from '@/components/back-button';

/** Journal-only accent mapping. Neutral surfaces remain owned by Design System v2. */
export function useJournalColors() {
  const design = useDesignColors();
  const theme = useTheme();
  return { ...design, accent: theme.accent, accentSoft: theme.accentMuted, onAccent: theme.onAccent };
}

export function JournalGroup({ children, label }: { children: ReactNode; label?: string }) {
  const colors = useDesignColors();
  return <GroupSurface accessibilityLabel={label} style={[styles.group, { borderColor: colors.border }]}>{children}</GroupSurface>;
}

/** Long editorial words receive the full line at accessibility text sizes. */
export function JournalHeader({ title, backLabel, onBack, onLayout, options }: {
  title: string; backLabel: string; onBack: () => void; onLayout?: (event: LayoutChangeEvent) => void; options?: ReactNode;
}) {
  const { fontScale } = useWindowDimensions();
  const back = <BackButton appearance="v2" iconOnly accessibilityLabel={backLabel} onPress={onBack} />;
  const heading = <UiText type="editorTitle" accessibilityRole="header" style={fontScale >= 1.5 ? { minWidth: 0 } : { flex: 1, minWidth: 0 }}>{title}</UiText>;
  return <View onLayout={onLayout} style={[styles.header, { flexDirection: fontScale >= 1.5 ? 'column' : 'row', alignItems: fontScale >= 1.5 ? 'stretch' : 'center' }]}>
    {fontScale >= 1.5 ? <><View style={styles.headerActions}>{back}{options}</View>{heading}</> : <>{back}{heading}{options}</>}
  </View>;
}

export function JournalSectionHeading({ title, description, icon }: { title: string; description?: string; icon: UiIconName }) {
  const colors = useJournalColors();
  return <View style={styles.heading}>
    <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}><UiIcon name={icon} size={24} color={colors.accent} /></View>
    <View style={styles.headingText}><UiText type="cardTitle" accessibilityRole="header">{title}</UiText>
      {description && <UiText type="secondary" color="textSecondary">{description}</UiText>}</View>
  </View>;
}

/** One scoped primary action; persistence and disabled state remain with the editor. */
export function JournalSaveAction({ label, accessibilityLabel, disabled, onPress }: {
  label: string; accessibilityLabel: string; disabled: boolean; onPress: () => void;
}) {
  const colors = useJournalColors();
  return <UiPressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress} style={[styles.save, { backgroundColor: disabled ? colors.inset : colors.accent }]}>
    <UiText type="button" style={{ color: disabled ? colors.textMuted : colors.onAccent, textAlign: 'center' }}>{label}</UiText>
  </UiPressable>;
}

const styles = StyleSheet.create({
  header: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: Space.lg, gap: Space.sm },
  headerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  group: { padding: Space.lg, gap: Space.lg, borderWidth: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  headingText: { flex: 1, minWidth: 0, gap: Space.xs },
  icon: { width: 40, height: 40, borderRadius: Shape.control, justifyContent: 'center', alignItems: 'center' },
  save: { minHeight: TouchTarget, padding: Space.md, borderRadius: Shape.control, justifyContent: 'center' },
});
