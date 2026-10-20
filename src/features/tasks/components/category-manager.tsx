import { useState } from 'react';
import { Alert, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AdaptiveModal, AdaptiveSheet } from '@/components/adaptive-sheet';
import { BackButton } from '@/components/back-button';
import { ContextMenu } from '@/components/context-menu';
import { DesignProvider, UiIcon, UiText, useDesignColors } from '@/components/design-system';
import { EditorSection } from '@/components/editor-section';
import type { UiIconName } from '@/components/ui-icon';
import { DesignSpace as Space, Shape, TouchTarget, type DesignPalette } from '@/constants/design-system-v2';

import { userError } from '../form';
import type { TaskCategory } from '../types';
import { TaskButton, TaskError, TaskField } from './controls';

// Presentation only. Rows and ownership still come from the authoritative supplied categories.
const builtInPresentation: Readonly<Record<string, { icon: UiIconName; background: keyof DesignPalette; foreground: keyof DesignPalette }>> = {
  Finance: { icon: 'chart', background: 'taskAccentSoft', foreground: 'info' },
  Health: { icon: 'heart', background: 'brandSoft', foreground: 'brand' },
  Personal: { icon: 'person', background: 'taskAccentSoft', foreground: 'taskText' },
  Shopping: { icon: 'cart', background: 'attentionSoft', foreground: 'attention' },
  Study: { icon: 'graduation', background: 'taskAccentSoft', foreground: 'info' },
  Work: { icon: 'briefcase', background: 'fitnessAccentSoft', foreground: 'fitnessText' },
};

function CategoryRow({ category, onDelete }: { category: TaskCategory; onDelete: (category: TaskCategory) => void }) {
  const colors = useDesignColors();
  const { fontScale } = useWindowDimensions();
  const presentation = category.isDefault ? builtInPresentation[category.name] : undefined;
  const badge = <View style={[styles.badge, { backgroundColor: colors.groupStrong }]}>
    <UiText type="smallLabel" color="textSecondary" accessible={false} importantForAccessibility="no">Built-in</UiText>
  </View>;
  return <View testID={`task-category-${category.id}`} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.control }]}
    accessible={category.isDefault} accessibilityLabel={category.isDefault ? `${category.name}, Built-in category` : undefined}>
    <View style={[styles.icon, { backgroundColor: colors[presentation?.background ?? 'taskAccentSoft'] }]}>
      <UiIcon name={presentation?.icon ?? 'tag'} color={colors[presentation?.foreground ?? 'taskText']} />
    </View>
    {category.isDefault ? <View style={[styles.ownership, fontScale >= 1.5 && styles.stackedOwnership]}>
      <UiText type="body" accessible={false} importantForAccessibility="no" style={fontScale >= 1.5 ? styles.wrappingName : styles.name}>{category.name}</UiText>{badge}
    </View> : <>
      <UiText type="body" style={styles.name}>{category.name}</UiText>
      <ContextMenu appearance="v2" label={`Actions for category ${category.name}`} actions={[
        { label: 'Delete', accessibilityLabel: `Delete category ${category.name}`, variant: 'destructive', onPress: () => onDelete(category) },
      ]} />
    </>}
  </View>;
}

export function CategoryManager({ categories, onCreate, onDelete, onDismiss }: {
  categories: TaskCategory[];
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onDismiss: () => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<{ source: 'create' | 'delete'; message: string } | null>(null);
  const colors = useDesignColors();
  const { fontScale } = useWindowDimensions();
  const active = categories.filter((category) => category.deletedAt === null);
  const custom = active.filter((category) => !category.isDefault);
  const builtIn = active.filter((category) => category.isDefault);

  function create() {
    try {
      onCreate(name);
      setName('');
      setError(null);
    } catch (cause) {
      setError({ source: 'create', message: userError(cause, 'Unable to create this category. Please try again.') });
    }
  }

  function remove(category: TaskCategory) {
    Alert.alert('Delete category?', `Tasks in “${category.name}” will stay, without a category label.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        try {
          onDelete(category.id);
          setError(null);
        } catch (cause) {
          setError({ source: 'delete', message: userError(cause, 'Unable to delete this category. Please try again.') });
        }
      } },
    ]);
  }

  return (
    <DesignProvider><AdaptiveModal onDismiss={onDismiss}>
      <AdaptiveSheet appearance="v2" contentContainerStyle={styles.content} header={<View style={styles.header}>
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
        <View style={[styles.heading, fontScale >= 1.5 && styles.stackedHeading]}>
          <View style={[styles.back, { backgroundColor: colors.control }]}><BackButton appearance="v2" iconOnly accessibilityLabel="Back to Tasks" onPress={onDismiss} /></View>
          <View style={[styles.headingText, fontScale >= 1.5 && styles.fullHeadingText]}>
            <UiText type="editorTitle" accessibilityRole="header">Categories</UiText>
            <UiText type="secondary" color="textSecondary">Organize your tasks with categories.</UiText>
          </View>
        </View>
      </View>}>
        <EditorSection headingType="cardTitle" variant="group" title="Create category" description="Add a custom category to keep your tasks organized." icon="plus">
          <TaskError appearance="v2" message={error?.source === 'create' ? error.message : null} />
          <TaskField appearance="v2" label="Category name" placeholder="Category name" helperText={!name.trim() ? 'Enter a name to create a category.' : undefined}
            value={name} onChangeText={setName} returnKeyType="done" onSubmitEditing={create} />
          <TaskButton appearance="v2" variant="primary" label="Create category" onPress={create} disabled={!name.trim()} />
        </EditorSection>
        <EditorSection headingType="cardTitle" variant="group" title="Your categories" description="Categories you've created." icon="person">
          <TaskError appearance="v2" message={error?.source === 'delete' ? error.message : null} />
          {custom.length ? <View style={styles.rows}>{custom.map((category) => <CategoryRow key={category.id} category={category} onDelete={remove} />)}</View>
            : <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.brandSoft }]}><UiIcon name="tag" color={colors.brand} size={24} /></View>
              <UiText type="cardTitle" style={styles.centered}>No custom categories yet.</UiText>
              <UiText type="secondary" color="textSecondary" style={styles.centered}>Create a category to group your tasks your way.</UiText>
            </View>}
        </EditorSection>
        <EditorSection headingType="cardTitle" variant="group" title="Built-in" description="Default categories, always available." icon="book">
          <View style={styles.rows}>{builtIn.map((category) => <CategoryRow key={category.id} category={category} onDelete={remove} />)}</View>
        </EditorSection>
      </AdaptiveSheet>
    </AdaptiveModal></DesignProvider>
  );
}

const styles = StyleSheet.create({
  content: { padding: Space.md, gap: Space.md },
  header: { padding: Space.md, gap: Space.sm },
  handle: { alignSelf: 'center', width: 32, height: 4, borderRadius: 2 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  stackedHeading: { flexDirection: 'column', alignItems: 'flex-start' },
  headingText: { flex: 1, minWidth: 0, gap: Space.xs },
  back: { width: TouchTarget, height: TouchTarget, borderRadius: TouchTarget / 2, overflow: 'hidden' },
  fullHeadingText: { flex: 0, alignSelf: 'stretch' },
  rows: { gap: Space.xs },
  row: { minHeight: TouchTarget, paddingVertical: Space.xs, paddingHorizontal: Space.sm, borderWidth: 1, borderRadius: Shape.control, flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  icon: { width: 32, height: 32, borderRadius: Shape.inset, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  name: { flex: 1, minWidth: 0 },
  wrappingName: { maxWidth: '100%' },
  ownership: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  stackedOwnership: { flexDirection: 'column', alignItems: 'flex-start' },
  badge: { borderRadius: Shape.status, paddingHorizontal: Space.sm, paddingVertical: Space.xs, flexShrink: 0 },
  empty: { padding: Space.md, borderWidth: 1, borderStyle: 'dashed', borderRadius: Shape.control, alignItems: 'center', gap: Space.sm },
  emptyIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  centered: { textAlign: 'center' },
});
