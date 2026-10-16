import { StyleSheet, View } from 'react-native';

import { CircularProgress } from '@/components/circular-progress';
import { UiIcon, UiText, useDesignColors } from '@/components/design-system';

import { exerciseProgress } from '../workout-presentation';

const size = 52;
/** Set-level semantics remain separate from overall workout completion. */
export function ExerciseProgress({ name, completed, planned }: { name: string; completed: number; planned: number | null }) {
  const colors = useDesignColors();
  const { ratio, complete, label } = exerciseProgress(completed, planned);
  return <View testID={`exercise-progress-${name}`} accessible accessibilityRole={planned === null ? 'text' : 'progressbar'}
    accessibilityLabel={`${name}, ${label}${complete ? ', exercise complete' : ''}`}
    accessibilityValue={planned === null ? { text: label } : { min: 0, max: planned, now: Math.min(completed, planned), text: label }} style={styles.root}>
    <CircularProgress ratio={ratio} size={size} color={colors.fitnessAccent} trackColor={colors.fitnessAccentSoft}>
      {complete ? <UiIcon name="check" color={colors.fitnessText} size={22} /> : <UiText type="numeric" color="fitnessText">{completed}</UiText>}
    </CircularProgress>
  </View>;
}
const styles = StyleSheet.create({
  root: { width: size, height: size, flexShrink: 0 },
});
