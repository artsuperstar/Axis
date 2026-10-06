import { ContextMenu } from '@/components/context-menu';

export function TaskOptions({ disabled, onOpen, onCategories, onRepeating, onHistory }: {
  disabled: boolean; onOpen: () => void;
  onCategories: () => void; onRepeating: () => void; onHistory: () => void;
}) {
  return <ContextMenu label="Task options" disabled={disabled} onOpen={onOpen} actions={[
    { label: 'Categories', onPress: onCategories },
    { label: 'Repeating Tasks', onPress: onRepeating },
    { label: 'History', onPress: onHistory },
  ]} />;
}
