import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AdaptiveModal, AdaptiveSheet } from '@/components/adaptive-sheet';
import { Spacing } from '@/constants/theme';

import { userError } from '../form';
import type { TaskCategory } from '../types';
import { TaskButton, TaskError, TaskField } from './controls';

export function CategoryManager({ categories, onCreate, onDelete, onDismiss }: {
  categories: TaskCategory[];
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onDismiss: () => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function create() {
    try {
      onCreate(name);
      setName('');
      setError(null);
    } catch (cause) {
      setError(userError(cause, 'Unable to create this category. Please try again.'));
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
          setError(userError(cause, 'Unable to delete this category. Please try again.'));
        }
      } },
    ]);
  }

  return (
    <AdaptiveModal onDismiss={onDismiss}>
      <AdaptiveSheet contentContainerStyle={styles.content} header={<View style={styles.header}>
        <ThemedText type="sheetTitle" accessibilityRole="header" style={{ flex: 1 }}>Categories</ThemedText>
        <TaskButton variant="quiet" label="Done" onPress={onDismiss} />
              </View>}>
        <TaskError message={error} />
        <TaskField label="Category name" value={name} onChangeText={setName} returnKeyType="done" onSubmitEditing={create} />
        <TaskButton label="Create category" onPress={create} disabled={!name.trim()} />
        {categories.map((category) => (
          <View key={category.id} style={styles.row}>
            <View style={styles.name}>
              <ThemedText>{category.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{category.isDefault ? 'Built-in' : 'Custom'}</ThemedText>
            </View>
            {!category.isDefault && <TaskButton label="Delete" onPress={() => remove(category)} />}
          </View>
        ))}
      </AdaptiveSheet>
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.three },
  content: { padding: Spacing.three, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { flex: 1 },
});
