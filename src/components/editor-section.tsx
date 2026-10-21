import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { GroupSurface, UiIcon, UiText, useDesignColors } from './design-system';
import type { UiIconName } from './ui-icon';
import { DesignSpace as Space } from '@/constants/design-system-v2';

/** An owned editor section; feature forms continue to own its fields and behavior. */
export function EditorSection({ title, description, icon, children, headingType = 'editorSection', variant = 'surface' }: {
  title: string; description: string; icon: UiIconName; children: ReactNode;
  headingType?: 'editorSection' | 'cardTitle'; variant?: 'surface' | 'group';
}) {
  const colors = useDesignColors();
  return <GroupSurface variant={variant} testID={`editor-section-${title.toLowerCase()}`}
    style={[styles.section, { borderColor: colors.border }]}>
    <View style={styles.heading}>
      <View style={[styles.icon, { backgroundColor: colors.brandSoft }]}><UiIcon name={icon} color={colors.brand} size={22} /></View>
      <View style={styles.text}>
        <UiText type={headingType} accessibilityRole="header">{title}</UiText>
        {!!description && <UiText type="secondary" color="textSecondary">{description}</UiText>}
      </View>
    </View>
    {children}
  </GroupSurface>;
}

const styles = StyleSheet.create({
  section: { padding: Space.md, gap: Space.md, borderWidth: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text: { flex: 1, minWidth: 0 },
});
