import { ContextMenu } from '@/components/context-menu';
import { useDesignColors } from '@/components/design-system';
import { View } from 'react-native';

export function TaskOptions({ disabled, onOpen, onCategories, onRepeating, onHistory }: {
  disabled: boolean; onOpen: () => void;
  onCategories: () => void; onRepeating: () => void; onHistory: () => void;
}) {
  const colors = useDesignColors();
  return <View style={{ borderRadius: 24, backgroundColor: colors.control }}><ContextMenu label="Task options" appearance="v2" disabled={disabled} onOpen={onOpen} actions={[
    { label: 'Categories', onPress: onCategories },
    { label: 'Repeating Tasks', onPress: onRepeating },
    { label: 'History', onPress: onHistory },
  ]} /></View>;
}
